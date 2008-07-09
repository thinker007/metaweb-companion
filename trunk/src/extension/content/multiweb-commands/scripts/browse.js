const MODE_VIEW_ALL = 0;
const MODE_VIEW_ONE = 1;

var thumbnailRecords = [];
var toDrawNext = 0;
var mode = MODE_VIEW_ALL;
var currentlyViewed;

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
	
	if (thumbnailRecords.length > 0) {
		window.setTimeout(drawAllThumbnails, 1000);
	}
	
	var overlay = document.getElementById("multiview-overlay");
	overlay.addEventListener('mousemove', onMultiviewOverlayMouseMove, true);
	overlay.addEventListener('click', onMultiviewOverlayClick, true);
}

function inspect(o) {
	window.openDialog("chrome://inspector/content/inspector.xul", "inspector", "chrome,width=800,height=600,all", o);
}

function addPage(url) {
	var contentStack = document.getElementById("content-stack");
	var multiviewScrollbox = document.getElementById("multiview-scrollbox-inner");
	
	var loader = document.getElementById("loader-template").cloneNode(true);
	loader.hidden = false;
	contentStack.appendChild(loader);
	
	var hbox = loader.getElementsByTagName("hbox")[0];
	var div = hbox.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "div")[0];
	div.appendChild(document.createTextNode(url));
	
	var browser = document.createElementNS("http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul", "browser");
	browser.setAttribute("type", "content");
	browser.setAttribute("flex", 1);
	
	loader.appendChild(browser);
	
	browser.stop();
	browser.userTypedValue = url;
	
	// This is to prevent frame busting.
    var progressListener = {
        QueryInterface : function(iid) {
            if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
                iid.equals(Components.interfaces.nsISupportsWeakReference) ||
                iid.equals(Components.interfaces.nsISupports)) {
                return this;
            }
            throw Components.results.NS_NOINTERFACE;
        },
    
        stateIsRequest: false,
        onStateChange : function(progress, request, flags, status) {
			try {
				var win = browser.contentDocument.defaultView.wrappedJSObject;
				win["top"] = win["self"] = win["parent"] = win;
			} catch (e) {}
		},
        onProgressChange : function() {},
        onStatusChange : function() {},
        onSecurityChange : function() {},
        onLinkIconAvailable : function() {}, 
        onLocationChange: function(progress, request, location) {}
    };
    browser.addProgressListener(progressListener, 
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);

	const nsIWebNavigation = Components.interfaces.nsIWebNavigation;
	var flags = nsIWebNavigation.LOAD_FLAGS_NONE; //LOAD_FLAGS_ALLOW_THIRD_PARTY_FIXUP;
	try {
		browser.loadURIWithFlags(url, flags, null, "utf-8", null);
	} catch (ex) {
		alert(ex);
	}

	
	var box = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
	box.style.width = "400px";
	box.style.margin = "10px";
	box.innerHTML = 
		'<div style="height: 2em; margin-bottom: 5px; overflow: hidden; color: white;"> </div>' +
		'<div style="padding: 5px; background: white">' +
			'<canvas style="width: 100%"></canvas>' +
		'</div>';
	multiviewScrollbox.appendChild(box);
	
	thumbnailRecords.push({
		url: 		url,
		loader:		loader,
		browser: 	browser,
		canvas:		box.childNodes[1].childNodes[0]
	});
	
	var urlBox = box.childNodes[0];
	urlBox.firstChild.nodeValue = url;
	urlBox.title = url;
}

function drawAllThumbnails() {
	try {
		for (var i = 0; i < thumbnailRecords.length; i++) {
			redrawThumbnail(thumbnailRecords[i]);
		}
	} catch (e) {
		alert(e);
	}
	
	window.setInterval(redrawNextThumbnail, 1000);
}

function redrawNextThumbnail() {
	if (mode != MODE_VIEW_ALL) {
		return;
	}
	
	var containingRect = document.getElementById("multiview-scrollbox").getBoundingClientRect();
	while (toDrawNext < thumbnailRecords.length) {
		var thumbnailRecord = thumbnailRecords[toDrawNext];
		toDrawNext++;
		
		var rect = thumbnailRecord.loader.getBoundingClientRect();
		if ((rect.left >= containingRect.left && rect.left < containingRect.right) ||
			(rect.right >= containingRect.left && rect.right < containingRect.right)) {
			redrawThumbnail(thumbnailRecord);
			break;
		}
	}
	toDrawNext = toDrawNext % thumbnailRecords.length;
}

function redrawThumbnail(record) {
	try {
		var doc = record.browser.contentDocument;
		var docWidth = doc.body.offsetWidth;
		var docHeight = Math.max(doc.body.offsetHeight, record.browser.contentWindow.innerHeight);
		
		var canvas = record.canvas;
		var canvasWidth = canvas.offsetWidth;
		var scale = canvasWidth / docWidth;
		var canvasHeight = Math.floor(docHeight * scale);
		
		record.scale = scale;
		
		canvas.style.height = canvasHeight + "px";
		canvas.setAttribute("width", docWidth);
		canvas.setAttribute("height", docHeight);
		
		var ctx = canvas.getContext("2d");
		ctx.save();
		ctx.drawWindow(record.browser.contentWindow, 0, 0, docWidth, docHeight, "rgba(255, 255, 255, 255)");
		ctx.restore();
	} catch (e) {}
}

function onMultiviewOverlayMouseMove(event) {
	var magnifier = getMagnifierElement();
	var onFailure = function() {
		magnifier.style.display = "none";
	};
	var onSuccess = function(index, thumbnailRecord, clientX, clientY, clientBounds) {
		if ("scale" in thumbnailRecord) {
			var magnifierCanvas = magnifier.firstChild;
			var magnifierCanvasWidth = magnifierCanvas.offsetWidth;
			var magnifierCanvasHeight = magnifierCanvas.offsetHeight;
			
			var docX = Math.max(0, Math.floor((clientX - clientBounds.left) / thumbnailRecord.scale - magnifierCanvasWidth / 2));
			var docY = Math.max(0, Math.floor((clientY - clientBounds.top) / thumbnailRecord.scale - magnifierCanvasHeight / 2));
			
			var ctx = magnifierCanvas.getContext("2d");
			ctx.save();
			ctx.drawWindow(thumbnailRecord.browser.contentWindow, docX, docY, magnifierCanvasWidth, magnifierCanvasHeight, "rgba(255, 255, 255, 255)");
			ctx.restore();
			
			var multiviewOverlay = getMultiviewOverlay();
			var overlayClientBounds = multiviewOverlay.getBoundingClientRect();
			
			var left = Math.min(
				clientX - overlayClientBounds.left + 20,
				overlayClientBounds.right - overlayClientBounds.left - 20 - magnifierCanvasWidth
			);
			var top = clientY - overlayClientBounds.top + 20;
			if (top + magnifierCanvasHeight > overlayClientBounds.bottom - overlayClientBounds.top) {
				top = clientY - overlayClientBounds.top - 20 - magnifierCanvasHeight;
			}
			
			magnifier.style.display = "block";
			magnifier.style.left = Math.floor(left) + "px";
			magnifier.style.top = Math.floor(top) + "px";
		} else {
			onFailure();
		}
	};
	locateThumbnail(event, onSuccess, onFailure);
}

function locateThumbnail(event, onSuccess, onFailure) {
	var clientX = event.clientX;
	var clientY = event.clientY;
	for (var i = 0; i < thumbnailRecords.length; i++) {
		var thumbnailRecord = thumbnailRecords[i];
		var clientBounds = thumbnailRecord.canvas.getBoundingClientRect();
		if (clientX >= clientBounds.left && clientX < clientBounds.right &&
			clientY >= clientBounds.top && clientY < clientBounds.bottom) {
			
			try {
				onSuccess(i, thumbnailRecord, clientX, clientY, clientBounds);
			} catch (e) {
			} finally {
				return;
			}
		}
	}
	onFailure();
};

function getMagnifierElement() {
	var elmt = document.getElementById("magnifier");
	if (elmt == null) {
		elmt = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
		elmt.id = "magnifier";
		elmt.style.position = "absolute";
		elmt.style.border = "1px solid #aaa";
		
		elmt.innerHTML = '<canvas style="width: 300px; height: 100px; -moz-border-radius: 20px;" width="300" height="100"></canvas>';
		
		getMultiviewOverlay().appendChild(elmt);
	}
	return elmt;
}

function getMultiviewOverlay() {
	return document.getElementById("multiview-overlay");
}

function onMultiviewOverlayClick(event) {
	var onFailure = function() {
	};
	var onSuccess = function(index, thumbnailRecord, clientX, clientY, clientBounds) {
		if ("scale" in thumbnailRecord) {
			var win = thumbnailRecord.browser.contentDocument.defaultView.wrappedJSObject;
			
			var docX = Math.floor((clientX - clientBounds.left) / thumbnailRecord.scale);
			var docY = Math.floor((clientY - clientBounds.top) / thumbnailRecord.scale);
			
			var scrollY = Math.max(0, Math.floor(docY - win.innerHeight / 2));
			var scrollX = Math.max(0, Math.floor(docX - win.innerWidth / 2));
			
			win.scroll(scrollX, scrollY);
		}
		mode = MODE_VIEW_ONE;
		switchToDoc(index);
	};
	locateThumbnail(event, onSuccess, onFailure);
}

function switchToDoc(index) {
	hideLightboxOverlay();
	
	currentlyViewed = index;
	
	document.getElementById("content-stack").selectedIndex = index + 1;
	document.getElementById("control-stack").selectedIndex = 1;
	
	document.getElementById("previous-doc-button").disabled = (index == 0);
	document.getElementById("next-doc-button").disabled = (index == thumbnailRecords.length - 1);
}

function zoomOut() {
	hideLightboxOverlay();
	
	mode = MODE_VIEW_ALL;
	document.getElementById("content-stack").selectedIndex = 0;
	document.getElementById("control-stack").selectedIndex = 0;
}

function previousDoc() {
	switchToDoc(currentlyViewed - 1);
}

function nextDoc() {
	switchToDoc(currentlyViewed + 1);
}

function getDocuments() {
	var docs = [];
	for (var i = 0; i < thumbnailRecords.length; i++) {
		var thumbnailRecord = thumbnailRecords[i];
		var doc = thumbnailRecord.browser.contentDocument;
		docs.push(doc);
	}
	return docs;
}

function clearPins() {
	document.getElementById("multiview-pin-shadow-overlay").innerHTML = "";
	document.getElementById("multiview-pin-overlay").innerHTML = "";
}

function addPin(docIndex, elmt) {
	var thumbnailRecord = thumbnailRecords[docIndex];
	if ("scale" in thumbnailRecord) {
		try {
			var win = thumbnailRecord.browser.contentDocument.defaultView.wrappedJSObject;
			var scrollTop = win.scrollY;
			var scrollLeft = win.scrollX;
	
			var rect = elmt.getClientRects().item(0);
			var scaledYOffset = Math.ceil(thumbnailRecord.scale * (scrollTop + (rect.top + rect.bottom) / 2));
			var scaledXOffset = Math.ceil(thumbnailRecord.scale * (scrollLeft + (rect.left + rect.right) / 2));
			
			var canvasBounds = thumbnailRecord.canvas.getBoundingClientRect();
			var multiviewOverlayBounds = getMultiviewOverlay().getBoundingClientRect();
			
			var x = canvasBounds.left - multiviewOverlayBounds.left + scaledXOffset;
			var y = canvasBounds.top - multiviewOverlayBounds.top + scaledYOffset;
			
			addImage(
				document.getElementById("multiview-pin-shadow-overlay"), 
				"chrome://companion/skin/images/pin-shadow.png",
				x - 3, y - 15);
				
			addImage(
				document.getElementById("multiview-pin-overlay"), 
				"chrome://companion/skin/images/pin.png",
				x - 3, y - 15);
		} catch (e) {
		}
	}
}

function addImage(parent, url, x, y) {
	var img = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
	img.src = url;
	img.style.position = "absolute";
	img.style.left = x + "px";
	img.style.top = y + "px";
	parent.appendChild(img);
}

const overlayID = "metawebCompanion-lightboxOverlay";
function focus(itemIDs) {
	if (mode == MODE_VIEW_ALL) {
		return;
	}
	
	var doc = thumbnailRecords[currentlyViewed].browser.contentDocument;
    var overlayDiv = doc.getElementById(overlayID);
    if (!(overlayDiv)) {
        var self = this;
        
        overlayDiv = doc.createElement("div");
        overlayDiv.id = overlayID;
        overlayDiv.style.position = "fixed";
        overlayDiv.style.top = "0px";
        overlayDiv.style.left = "0px";
        overlayDiv.style.width = "100%";
        overlayDiv.style.height = "100%";
        overlayDiv.style.zIndex = "10000";
        doc.body.appendChild(overlayDiv);
        
        overlayDiv.innerHTML = 
            '<div style="position: relative; width: 100%; height: 100%;">' +
                '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; -moz-opacity: 0.5; background-color: black"></div>' +
                '<div style="position: absolute; top: 70px; left: 70px; right: 70px; bottom: 70px;">' +
                    '<iframe style="width: 100%; height: 100%;"></iframe>' +
                '</div>' +
            '</div>';
        overlayDiv.firstChild.firstChild.addEventListener('click', function(evt) { hideLightboxOverlay(); }, true);
    }
    
    overlayDiv.getElementsByTagName("iframe")[0].src = "http://freebase.com/view" + itemIDs[0];
}

function hideLightboxOverlay() {
	if (mode == MODE_VIEW_ALL) {
		return;
	}
	try {
		var doc = thumbnailRecords[currentlyViewed].browser.contentDocument;
	    var overlayDiv = doc.getElementById(overlayID);
	    if (overlayDiv) {
	        overlayDiv.parentNode.removeChild(overlayDiv);
	    }
	} catch (e) {
	}
}
