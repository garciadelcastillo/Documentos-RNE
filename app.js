/*
	██████╗  ██████╗  ██████╗██╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗ ██████╗ ███████╗      ██████╗ ███╗   ██╗███████╗
	██╔══██╗██╔═══██╗██╔════╝██║   ██║████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔═══██╗██╔════╝      ██╔══██╗████╗  ██║██╔════╝
	██║  ██║██║   ██║██║     ██║   ██║██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ██║   ██║███████╗█████╗██████╔╝██╔██╗ ██║█████╗  
	██║  ██║██║   ██║██║     ██║   ██║██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ██║   ██║╚════██║╚════╝██╔══██╗██║╚██╗██║██╔══╝  
	██████╔╝╚██████╔╝╚██████╗╚██████╔╝██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ╚██████╔╝███████║      ██║  ██║██║ ╚████║███████╗
	╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝    ╚═════╝ ╚══════╝      ╚═╝  ╚═╝╚═╝  ╚═══╝╚══════╝
	
	A batch downloader and renamer for the radio documentary series of RNE: 
		http://www.rtve.es/alacarta/audios/documentos-rne/

*/

// Load modules
var http = require('http');
var fs = require('fs');
var util = require('util');
var cheerio = require('cheerio');
var sanitize = require('sanitize-filename');
var request = require('request');
var progress = require('request-progress');
var nodeID3 = require('node-id3');



// This is just for reference, the real main one will be derived from a table page loader AJAX req url
var baseURL = "http://www.rtve.es/alacarta/audios/documentos-rne/";

// Max items to check on virtual ajax query
var maxCheckedItems = 30;   // as of 2016.12.20 there are 351 published documentaries

// Max items to download (could be less than the check if only wanted to download the most recent...)
var maxDownloadItems = 400;

// Minimum duration in secs for the podcast to be downloaded
// (there are a bunch of ~50 secs teasers)
var minPodLength = 120;  

// Wait time in secs to wait until next download is triggered
// (let's not overload the server ;)
var waitTime = 5;

// Real url as ajax query to fetch an HTML will links to ALL documentaries
var mainURL = "http://www.rtve.es/alacarta/interno/contenttable.shtml?pbq=1&orderCriteria=DESC&modl=TOC&locale=es&pageSize=" 
	+ maxCheckedItems + "&ctx=1938";

// Aboslute or relative download path
// var downloadPath = "D:/downloads";
var downloadPath = "./downloads";




// NO NEED TO TOUCH FROM HERE ON... 
var podcasts = [];
var downloadId = 0;
var downloadCount = 0;

// Check if download path exists
if (!fs.existsSync(downloadPath)) {
	console.log("Creating directory " + downloadPath);
	fs.mkdirSync(downloadPath);
}

// Initialize logger: http://stackoverflow.com/a/21061306/1934487
var log_file = fs.createWriteStream(downloadPath + '/log.txt', {flags : 'w'});  // choose 'a' to add to the existing file instead
var log_stdout = process.stdout;
console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};


console.log("STARTING BATCH DOWNLOAD on " + new Date());
parseHTML(mainURL);


function parseHTML(url) {
	var body, $;

	console.log("Requesting file list");
	var request = http.get(url, function(res) {

		res.on('data', function(chunk) {
			body += chunk;
		});

		res.on('end', function() {
			console.log("Done parsing " + url);
            // console.log(body);
            
			// Cheerio/jQuery
            $ = cheerio.load(body);

            $(".ContentTabla")
            	.children("ul")
            	.children(".odd,.even")
            	.each(function(i, elem) {
	            	podcasts.push(new Podcast($, elem));
            });

            // Run some quick checks and logs
            console.log("Found " + podcasts.length + " podcasts");

            var count = 0;
            for (var i = 0; i < podcasts.length; i++) {
            	if (podcasts[i].duration < minPodLength) count++;
            }
            console.log("Found " + count + " podcasts under " + minPodLength + "s long");

            console.log("Starting download of " + (podcasts.length - count) + " programs");
        	downloadNextPod();	// trigger download queue    	

		});


	}).on('error', function(err) {
		console.log("Error requesting " + url);
		console.log(err);
	});
}



// Based on http://stackoverflow.com/a/22907134/1934487
function downloadNextPod() {

	// Done?
	if (downloadId >= podcasts.length || downloadCount >= maxDownloadItems) {
		console.log("FINISHED DOWNLOADING " + downloadCount + " FILES, exiting...");
		return;
	}

	var podObj = podcasts[downloadId++];
	var fileName = sanitize(podObj.dateArr.join("-") + " - " + podObj.title + ".mp3");
	var dest = downloadPath + "/" + fileName;

	// Check if download path exists
	if (!fs.existsSync(downloadPath)) {
		console.log("Creating directory " + downloadPath);
		fs.mkdirSync(downloadPath);
	}

	var startTime = Date.now();

	console.log(" ");
	console.log((new Date()).toString());
	if (podObj.duration < minPodLength) {  // DEBUG
	// if (podObj.duration > minPodLength) {
		console.log("Starting download #" + downloadCount + ": " + fileName);

		var fileWriter = fs.createWriteStream(dest);
		// var req = http.get(podObj.mp3url, function(res) {
		// 	res.pipe(fileWriter);
		// 	fileWriter.on('finish', function() {
		// 		var duration = millisToMins(Date.now() - startTime);
		// 		console.log("Finished downloading " + fileName + " in " + duration + "mins");
		// 		downloadCount++;
		// 		fileWriter.close(timeoutDownload);
		// 	});
		
		// }).on('error', function(err) {
		// 	fs.unlink(dest);

		// 	console.log("ERROR DOWNLOADING " + fileName);
		// 	console.log(err.message);

		// 	timeoutDownload();  // continue with next
		// });

		// WHY U NOT WORKING??
		progress(request(podObj.mp3url, {
			throttle: 500,                    // Throttle the progress event to 2000ms, defaults to 1000ms 
		    delay: 0                       // Only start to emit after 1000ms delay, defaults to 0ms 
		    // lengthHeader: 'x-transfer-length'  // Length header to use, defaults to content-length 
		
		})
		.on('progress', function(state) {
			console.log(state);
		})
		.on('end', function() {
			var duration = millisToMins(Date.now() - startTime);
			console.log("Finished downloading " + fileName + " in " + duration + " mins");
			downloadCount++;
			fileWriter.close(timeoutDownload);

			// Write id3 tags
			var tags = {
				title: podObj.dateArr.join("-") + " - " + podObj.title,
				artist: "Documentos de RNE",
				year: podObj.dateArr[0]
			};

			var success = nodeID3.write(tags, dest);
			if (success) console.log("Successfuly written tags");


		})
		.on('error', function(err) {
			fs.unlink(dest);
			console.log("ERROR DOWNLOADING " + fileName);
			console.log(err.message);
			timeoutDownload();  // continue with next
		})
		.pipe(fileWriter));

	} else {
		console.log("Skipping " + fileName);
		console.log("--> Duration: " + podObj.duration);
		downloadNextPod();  // continue with next

	}
}

function timeoutDownload() {
	console.log("Waiting " + waitTime + " seconds...");
	setTimeout(downloadNextPod, waitTime * 1000);
}

function millisToMins(millis) {
	var m = "" + Math.floor(millis / 60000);
	while (m.length < 2) m = "0" + m;
	var s =  "" + Math.round((millis % 60000) / 1000);
	while (s.length < 2) s = "0" + s;
	return m + ":" + s;
}




// A class representing a podcast element constructed via the list element representing it
function Podcast($, elem) {

	this.$ = $;
	this.jQElem = this.$(elem);

	this.id = this.jQElem.children(".col_tit")
		.attr("id");

	this.title = this.jQElem.children(".tultip")
		.children(".tooltip")
		.children(".titulo-tooltip")
		.text()
		.trim();

	this.detail =  this.jQElem.children(".tultip")
		.children(".tooltip")
		.children(".detalle")
		.text()
		.replace(/\r?\n|\r/g, " ");  // clean newline chars

	this.durationStr = this.jQElem.children(".col_dur").text();
	this.duration = durationStringToSeconds(this.durationStr);
	this.popularity = this.jQElem.children(".col_pop").text();
	this.dateStr = this.jQElem.children(".col_fec").text();
	this.dateArr = dateStringToArray(this.dateStr);

	this.mp3url = this.jQElem.children(".col_tip")
		.children("a")
		.attr("href");

	this.toString = function() {
		return ""
			// + this.id + "\r\n" 
			+ this.dateArr.join("-") + " " + this.title + "\r\n"
			+ this.durationStr + " " + this.popularity + "\r\n"
			+ this.detail + "\r\n"
			+ this.mp3url 
			+ "\r\n";
	};

	// Node uses the default 'inspect' on console logs: http://stackoverflow.com/a/33469852/1934487
	this.inspect = this.toString;
}





// UTILITY FUNCTIONS

// Returns the duration in seconds given a string represnetation in the form "HH:MM:SS" or "MM:SS"
function durationStringToSeconds(durStr) {
	var digits = durStr.split(":");
	var seconds = 0;
	if (digits.length == 2) {
		seconds = 60 * Number(digits[0]) + Number(digits[1]);
	} else if (digits.length == 3) {
		seconds = 3600 * Number(digits[0]) + 60 * Number(digits[1]) + Number(digits[2]);
	}
	return seconds;
}


// A hash map of spanish months to values
var monthAbbrv = {
	"ene": "01",
	"feb": "02",
	"mar": "03",
	"abr": "04",
	"may": "05",
	"jun": "06",
	"jul": "07",
	"ago": "08",
	"sep": "09",
	"oct": "10",
	"nov": "11",
	"dic": "12"
};

// Returns an array of [year, month, day] values for a date representation in the form "DD mon YYYY" (in spanish)
function dateStringToArray(dateStr) {
	// The first element of the list reads "pasado Sabado" ("last Saturday")
	// If an element doesn't adhere to the "DD mon YYYY" format, return today's date
	var m = dateStr.match(/\d\d \w\w\w \d\d\d\d/g);  // quick and dirty check
	if (m == null) {
		var date = new Date();
		var d = date.getDay();
		if (d != 6) {
			date.setTime(date.getTime() - (d + 1) * 24 * 3600 * 1000);  // roll time back this many milliseconds. this accounts for month/year jumps, leap days, etc
		}
		var arr = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
		console.log("Invalid date string for '" + dateStr + "', applied last Saturday's: " + arr.join("-"));
		return arr;
	}

	// Compute date values for correctly formatted date strings
	var date = [];
	var strArr = dateStr.split(" ");
	date[0] = strArr[2];
	date[1] = monthAbbrv[strArr[1]];
	date[2] = strArr[0];
	return date;
}
