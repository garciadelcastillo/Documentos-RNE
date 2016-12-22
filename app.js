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
var cheerio = require('cheerio');
var sanitize = require('sanitize-filename');


// This is just for reference, the real main one will be derived from a table page loader AJAX req url
var baseURL = "http://www.rtve.es/alacarta/audios/documentos-rne/";

// Max items for virtual ajax query
var maxItems = 30;   // as of 2016.12.20 there are 351 published documentaries

// Real url as ajax query to fetch an HTML will links to ALL documentaries
var mainURL = "http://www.rtve.es/alacarta/interno/contenttable.shtml?pbq=1&orderCriteria=DESC&modl=TOC&locale=es&pageSize=" + maxItems + "&ctx=1938";

// Aboslute or relative download path
// var downloadPath = "D:\\Temp\\";
var downloadPath = "./downloads";



// NO NEED TO TOUCH FROM HERE ON... 
var podcasts = [];
var downloadId = 0;

parseHTML(mainURL);


function parseHTML(url) {
	var body, $;

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

        	// console.log(podcasts);

        	// for (var i = 0; i < podcasts.length; i++) {
        	// 	if (podcasts[i].duration < 60) {
        	// 		console.log("Downloading " + podcasts[i].title);
        	// 		download(podcasts[i].mp3url, downloadPath + i + ".mp3");
        	// 	}
        	// }



        	downloadNextPod();	// trigger download queue    	

		});


	}).on('error', function(err) {
		console.log("Error requesting " + url);
		console.log(err);
	});
}





// // Based on http://stackoverflow.com/a/22907134/1934487
// function download(url, dest, callback) {
// 	var file = fs.createWriteStream(dest);
// 	var req = http.get(url, function(res) {
// 		res.pipe(file);
// 		file.on('finish', function() {
// 			file.close(callback);
// 		});
	
// 	}).on('error', function(err) {
// 		fs.unlink(dest);
// 		if (callback) {
// 			callback(err.message);
// 		}
// 	});
// }

// Based on http://stackoverflow.com/a/22907134/1934487
function downloadNextPod() {

	// Done?
	if (downloadId >= podcasts.length) {
		console.log("FINISHED DOWNLOADING ALL FILES, exiting...");
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

	if (podObj.duration < 60) {
		console.log("Starting download of " + fileName);

		var file = fs.createWriteStream(dest);
		var req = http.get(podObj.mp3url, function(res) {
			res.pipe(file);
			file.on('finish', function() {
				console.log("Finished downloading " + fileName);
				file.close(downloadNextPod);
			});
		
		}).on('error', function(err) {
			fs.unlink(dest);

			console.log("ERROR DOWNLOADING " + fileName);
			console.log(err.message);

			downloadNextPod();  // continue with next
		});

	} else {
		downloadNextPod();  // continue with next

	}

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

// Returns the duration in seconds given a string represnetation in the form "HH:MM"
function durationStringToSeconds(durStr) {
	var digits = durStr.split(":");
	var seconds = 60 * Number(digits[0]);
	seconds += Number(digits[1]);
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




