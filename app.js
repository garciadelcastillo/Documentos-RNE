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

// This is just for reference, the real main one will be derived from a table page loader AJAX req url
var baseURL = "http://www.rtve.es/alacarta/audios/documentos-rne/";

// Max items to check on virtual ajax query
var maxCheckedItems = 400;   // as of 2016.12.20 there are 351 published documentaries

// Max items to download (could be less than the check if only wanted to download the most recent...)
var maxDownloadItems = 400;

// Podcasts under this duration in seconds will NOT be downloaded
// (there are a bunch of negligible ~50 secs teasers)
var minPodLength = 120;

// Wait time in secs to wait until next download is triggered
// (let's not overload the server ;)
var waitTime = 60;

// Real url as ajax query to fetch an HTML will links to ALL documentaries
var mainURL = "http://www.rtve.es/alacarta/interno/contenttable.shtml?pbq=1&orderCriteria=DESC&modl=TOC&locale=es&pageSize=" 
	+ maxCheckedItems + "&ctx=1938";

// Absolute or relative target download path
var downloadPath = "./downloads";
// var downloadPath = "D:/downloads";



//////////////////////////////////////////////////////////////
// UNLESS YOU KNOW WHAT YOU ARE DOING, DON'T TOUCH BELOW ;) // 
//////////////////////////////////////////////////////////////

// Load modules
var http = require('http');
var fs = require('fs');
var util = require('util');
var cheerio = require('cheerio');
var sanitize = require('sanitize-filename');
var nodeID3 = require('node-id3');

// Some process vars
var podcasts = [];
var downloadId = 0;
var downloadCount = 0;

// Check if download path exists
if (!fs.existsSync(downloadPath)) {
	console.log("Creating directory " + downloadPath);
	fs.mkdirSync(downloadPath);
}

// Initialize a console + file logger: http://stackoverflow.com/a/21061306/1934487
var log_file = fs.createWriteStream(downloadPath + '/log.txt', {flags : 'w'});  // choose 'a' to add to the existing file instead
var log_stdout = process.stdout;
console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

// Let's go!
console.log("STARTING BATCH DOWNLOAD on " + new Date());
parseHTML(mainURL);





// A function to fetch the database query url, 
// parse the response into objects and trigger the
// download queue 
function parseHTML(url) {
	var body, $;

	console.log("Requesting file list");
	var request = http.get(url, function(res) {

		res.on('data', function(chunk) {
			body += chunk;
		});

		res.on('end', function() {
			console.log("Done parsing " + url);
            
			// Cheerio/jQuery
            $ = cheerio.load(body);

            // Parse table objects into Podcasts
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

            // Trigger download queue 
            console.log("Starting download of " + (podcasts.length - count) + " programs");
        	downloadNextPod();	   	

		});


	}).on('error', function(err) {
		console.log("Error requesting " + url);
		console.log(err);
	});
}


// A function that sequentually downloads the next podcast in queue
// Based on http://stackoverflow.com/a/22907134/1934487
function downloadNextPod() {

	// Done?
	if (downloadId >= podcasts.length || downloadCount >= maxDownloadItems) {
		console.log("FINISHED DOWNLOADING " + downloadCount + " FILES, exiting...");
		return;
	}

	// File mngmt
	var podObj = podcasts[downloadId++];
	var fileName = sanitize(podObj.dateArr.join("-") + " - " + podObj.title + ".mp3");
	var dest = downloadPath + "/" + fileName;

	// Check if download path exists
	if (!fs.existsSync(downloadPath)) {
		console.log("Creating directory " + downloadPath);
		fs.mkdirSync(downloadPath);
	}

	// Timers
	var startTime = Date.now();
	console.log(" ");
	console.log((new Date()).toString());

	// Download if over minimum duration
	// if (podObj.duration < minPodLength) {  // DEBUG
	if (podObj.duration > minPodLength) {
		console.log("Starting download #" + downloadCount + ": " + fileName);

		var fileWriter = fs.createWriteStream(dest);
		
		// The main request
		var req = http.get(podObj.mp3url, function(res) {

			//http://stackoverflow.com/a/20203043/1934487
			var resLen = parseInt(res.headers['content-length'], 10);
			var cur = 0;
			var total = (resLen / 1048576).toFixed(3); //1048576 - bytes in  1Megabyte
			podObj.fileSize = total;
			var perc = 0;

			res.pipe(fileWriter);
			
			// Download progress on the console
			res.on('data', function(chunk) {
				cur += chunk.length;
				perc = (100 * cur / 1048576 / total).toFixed(2);
				process.stdout.write("Downloaded " + perc + "% of " + total + " MB\r");
			})

			// Close the file, add id3 tags and timeout next download
			fileWriter.on('finish', function() {
				var duration = millisToMins(Date.now() - startTime);
				console.log("Download complete: " + podObj.fileSize + " MB in " + duration + " mins");
				downloadCount++;
				fileWriter.close(timeoutDownload);

				// Write id3 tags
				var tags = {
					title: podObj.dateArr.join("-") + " - " + podObj.title,
					artist: "Documentos de RNE",
					year: podObj.dateArr[0],
					comment: podObj.detail
				};

				var success = nodeID3.write(tags, dest);
				if (success) console.log("Successfuly written tags");
			});
		
		}).on('error', function(err) {
			fs.unlink(dest);

			console.log("ERROR DOWNLOADING " + fileName);
			console.log(err.message);

			timeoutDownload();  // continue with next
		});


	} else {
		console.log("Skipping " + fileName + " --> (duration: " + podObj.duration + " < " + minPodLength + ")");
		downloadNextPod();  // continue with next

	}
}

// Pause before starting new download, we don't want people
// at RTVE to pull the plug... ;) 
function timeoutDownload() {
	console.log("Waiting " + waitTime + " seconds...");
	setTimeout(downloadNextPod, waitTime * 1000);
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

	this.fileSize = 0;  // in Mb

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
// Number to string conversion
function millisToMins(millis) {
	var m = "" + Math.floor(millis / 60000);
	while (m.length < 2) m = "0" + m;
	var s =  "" + Math.round((millis % 60000) / 1000);
	while (s.length < 2) s = "0" + s;
	return m + ":" + s;
}
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
