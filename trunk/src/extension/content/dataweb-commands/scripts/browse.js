var viewRecords = [];
function onLoad() {
    try {
        var url = document.location.href;
        var q = url.indexOf("?");
        if (q < 0) {
            return;
        }
        
        var freebaseIds = [];
        var paramPairs = url.substr(q + 1).split("&");
        for (var i = 0; i < paramPairs.length; i++) {
            var pair = paramPairs[i].split("=");
            var name = pair[0];
            var value = pair.length > 1 ? decodeURIComponent(pair[1]) : null;
            if (name == "fbids") {
                freebaseIds = freebaseIds.concat(value.split(";"));
            }
        }
        
        for (var i = 0; i < freebaseIds.length; i++) {
            addFreebaseItemView(freebaseIds[i]);
        }
		
		showSummary(viewRecords.length, viewRecords.length);
    } catch (e) {
        alert(e);
    }
}

function addFreebaseItemView(freebaseId) {
    var viewContainer = document.getElementById("view-container");
    var viewDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    viewDiv.className = "view";
    viewContainer.appendChild(viewDiv);
    
    var viewRecord = {
        freebaseId:     freebaseId,
        viewDiv:        viewDiv
    };
    viewRecords.push(viewRecord);
    
    var callbackId = Math.ceil(Math.random() * 1000000);
    var url = 
        "http://hotshot.dfhuynh.user.dev.freebaseapps.com/acre/json?id=" + encodeURIComponent(freebaseId) + 
            "&callback=cb" + encodeURIComponent(callbackId);
    var script = document.createElementNS("http://www.w3.org/1999/xhtml", "script");
    var cleanup = function() {
        script.parentNode.removeChild(script);
        delete window["cb" + callbackId];
        delete window["err" + callbackId];
    };
    var callback = function(o) {
        cleanup();
        processRenderingResult(viewRecord, o);
    };
    var errorHandler = function() {
        cleanup();
        processErrorResult(viewRecord);
    };
    window["cb" + callbackId] = callback;
    window["err" + callbackId] = errorHandler;
    
    script.setAttribute("onerror", "err" + callbackId + "()");
    script.setAttribute("src", url);
    document.getElementById("the-page").appendChild(script);
};

function processRenderingResult(viewRecord, o) {
    var div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    div.className = "freebase-hotshot-container";
    
    var table = document.createElementNS("http://www.w3.org/1999/xhtml", "table");
    div.appendChild(table);
    
    var tr = table.insertRow(0);
    tr.style.verticalAlign = "top";
    
    var firstTD = tr.insertCell(0);
    
    var h1 = document.createElementNS("http://www.w3.org/1999/xhtml", "h1");
    h1.className = "freebase-hotshot-name";
    h1.appendChild(document.createTextNode(o.name));
    firstTD.appendChild(h1);
    
    var divLinks = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    divLinks.className = "freebase-hotshot-links";
    firstTD.appendChild(divLinks);
    
    var a = document.createElementNS("http://www.w3.org/1999/xhtml", "a");
    a.setAttribute("href", "http://freebase.com/view" + viewRecord.freebaseId);
    a.appendChild(document.createTextNode("Freebase Link"));
    divLinks.appendChild(a);
    
    if ("description" in o) {
        var fragments = o.description.split("\\n");
        for (var i = fragments.length - 1; i >= 0; i--) {
            var fragment = fragments[i];
            if (fragment.length == 0) {
                fragments.splice(i, 1);
            }
        }

        if (fragments.length > 0) {
            var descriptionDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
            descriptionDiv.className = "freebase-hotshot-blurb";
            firstTD.appendChild(descriptionDiv);
            
            for (var i = 0; i < fragments.length; i++) {
                var fragment = fragments[i];
                if (i == fragments.length - 1) {
                    fragment += " ...";
                }
                
                var p = document.createElementNS("http://www.w3.org/1999/xhtml", "p");
                p.appendChild(document.createTextNode(fragment));
                descriptionDiv.appendChild(p);
            }
        }
    }
    
    if ("thumbnails" in o) {
        var secondTD = tr.insertCell(1);
        
        var thumbnails = o.thumbnails;
        
        for (var i = 0; i < thumbnails.length; i++) {
            var entry = thumbnails[i];
            
            var thumbnailDiv = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
            thumbnailDiv.className = "freebase-hotshot-thumbnail";
            secondTD.appendChild(thumbnailDiv);
            
            var img = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
            img.setAttribute("src", entry.url);
            img.setAttribute("title", entry.title);
            thumbnailDiv.appendChild(img);
        }
    }
    
    viewRecord.viewDiv.appendChild(div);
};

function processErrorResult(viewRecord) {
    var div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    div.className = "freebase-hotshot-container";
    div.appendChild(document.createTextNode(viewRecord.freebaseId));
    
    viewRecord.viewDiv.appendChild(div);
};

function highlight(identities) {
	var restrictedCount = 0;
	for (var i = 0; i < viewRecords.length; i++) {
		var viewRecord = viewRecords[i];
		if (identities.contains(viewRecord.freebaseId)) {
			viewRecord.viewDiv.style.display = "block";
			restrictedCount++;
		} else {
			viewRecord.viewDiv.style.display = "none";
		}
	}
	showSummary(viewRecords.length, restrictedCount);
};

function showSummary(totalCount, restrictedCount) {
	var div = document.getElementById("view-summary-container");
	div.innerHTML = "";
	
	if (restrictedCount == totalCount) {
		var span1 = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
		span1.innerHTML = restrictedCount + " topics";
		span1.className = "view-summary-count";
		div.appendChild(span1);
	} else {
		var span1 = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
		span1.innerHTML = restrictedCount + " topics";
		span1.className = "view-summary-count";
		div.appendChild(span1);
		
		div.appendChild(document.createTextNode(" filtered from "));

		var span2 = document.createElementNS("http://www.w3.org/1999/xhtml", "span");
		span2.innerHTML = totalCount;
		span2.className = "view-summary-original-count";
		div.appendChild(span2);

		div.appendChild(document.createTextNode(" originally"));
	}
};
