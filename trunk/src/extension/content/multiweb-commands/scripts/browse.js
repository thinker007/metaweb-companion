var thumbnailRecords = [];

function onLoad() {
	try {
		var url = document.location.href;
		var q = url.indexOf("?");
		if (q < 0) {
			return;
		}
		
		var paramPairs = url.substr(q + 1).split("&");
		for (var i = 0; i < paramPairs.length; i++) {
			var pair = paramPairs[i].split("=");
			var name = pair[0];
			var value = pair.length > 1 ? decodeURIComponent(pair[1]) : null;
			if (name == "u") {
				addPage(value);
			}
		}
	} catch (e) {
		alert(e);
	}
	
	window.setInterval(redrawThumbnails, 1000);
}

function addPage(url) {
	var contentStack = document.getElementById("content-stack");
	var multiviewScrollbox = document.getElementById("multiview-scrollbox");
	
	var browser = document.createElement("browser");
	contentStack.appendChild(browser);
	browser.setAttribute("src", url);
	
	var box = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
	box.style.width = "400px";
	box.style.margin = "20px";
	box.innerHTML = '<div style="padding: 10px; background: white"><canvas style="width: 100%"></canvas><div> </div></div>';
	multiviewScrollbox.appendChild(box);
	
	thumbnailRecords.push({
		url: 		url,
		browser: 	browser,
		canvas:		box.firstChild.firstChild
	});
	
	box.firstChild.childNodes[1].firstChild.nodeValue = url;
}

function redrawThumbnails() {
	try {
		for (var i = 0; i < thumbnailRecords.length; i++) {
			redrawThumbnail(thumbnailRecords[i]);
		}
	} catch (e) {
		alert(e);
	}
}

function redrawThumbnail(record) {
	try {
		var doc = record.browser.contentDocument;
		var docWidth = doc.body.offsetWidth;
		var docHeight = Math.max(doc.body.offsetHeight, doc.body.scrollHeight);
		
		var canvas = record.canvas;
		var canvasWidth = canvas.offsetWidth;
		var canvasHeight = Math.ceil(docHeight * canvasWidth / docWidth);
		
		canvas.style.height = canvasHeight + "px";
		canvas.setAttribute("width", docWidth);
		canvas.setAttribute("height", docHeight);
		
		var ctx = canvas.getContext("2d");
		ctx.save();
		ctx.drawWindow(record.browser.contentWindow, 0, 0, docWidth, docHeight, "rgba(255, 255, 255, 255)");
		ctx.restore();
	} catch (e) {}
}
