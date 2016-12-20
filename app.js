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


// This is just for reference, the real main one will be derived from a table page loader AJAX req url
var baseURL = "http://www.rtve.es/alacarta/audios/documentos-rne/";

// Max items for virtual ajax query
var maxItems = 10;   // as of 2016.12.20 there are 351 published documentaries

// Real url as ajax query to fetch an HTML will links to ALL documentaries
var mainURL = "http://www.rtve.es/alacarta/interno/contenttable.shtml?pbq=1&orderCriteria=DESC&modl=TOC&locale=es&pageSize=" + maxItems + "&ctx=1938";



// NO NEED TO TOUCH FROM HERE ON... 

parseHTML(mainURL);

function parseHTML(url) {
	var body, $;

	var request = http.get(url, function(res) {

		res.on('data', function(chunk) {
			body += chunk;
		});

		res.on('end', function() {
			console.log("Done parsing " + url);

			// Cheerio/jQuery
            $ = cheerio.load(body);

            console.log(body);
		});


	}).on('error', function(err) {
		console.log("Error requesting " + url);
		console.log(err);
	});
}

