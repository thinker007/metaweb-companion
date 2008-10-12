mw.ui.history.enabled = false;

Logging.log = function() {};

function genericErrorHandler(s, query) {
    Companion.log(s);
    Companion.log(JSON.stringify(query));
}

function copyChildren(from, to) {
    var child = from.firstChild;
    while (child != null) {
        to.appendChild(child.cloneNode(true));
        child = child.nextSibling;
    }
};

window.MetawebSuite.parallax.FacetPanelLayer._fillInDom = function(div) {
    div.innerHTML = "";
    
    copyChildren(document.getElementById("companion-facetPanelTemplate"), div);
    
    div.style.overflow = "auto";
    
    var divs = div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "div");
    var dom = {
        textSearchFacetContainer:   divs[0],
        heading:                    divs[1],
        controlContainer:           divs[2],
        facetContainer:             divs[3],
        statusSection:              divs[4]
    };
    dom.addFiltersAction = dom.controlContainer.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[0];
    
    return dom;
};

window.TextSearchFacet._fillInDom = function(div) {
    div.innerHTML = "";

    copyChildren(document.getElementById("companion-searchFacetTemplate"), div);
    
    var divs = div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "div");
    var dom = {
        headerDiv:      divs[0],
        inputDiv:       divs[1],
        statusDiv:      divs[2]
    };
    dom.input = dom.inputDiv.firstChild;
    dom.pastQuery = dom.statusDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "span")[0];
    dom.resetAction = dom.statusDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[0];
    
    return dom;
};

window.ListFacet._fillInDom = function(div) {
    div.innerHTML = "";

    copyChildren(document.getElementById("companion-facetTemplate"), div);
    
    var divs = div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "div");
    var headerDiv = divs[0];
    var footerDiv = divs[3];
    
    var headerActions = headerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a");
    var footerActions = footerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a");
    var footerSeparators = footerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "span");
    
    return {
        headerDiv:              headerDiv,
        closeButton:            headerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "img")[0],
        label:                  headerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "span")[0],
        resetAction:            headerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[0],
        mapAction:              headerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[1],
        showQueryAction:        headerDiv.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[2],
        
        bodyDiv:                divs[1],
        statusSection:          divs[2],
        
        footerDiv:              footerDiv,
        showAllAction:          footerActions[0],
        showTopChoicesAction:   footerActions[1],
        settingsAction:         footerActions[2],
        footerSeparators:       footerSeparators
    };
};

window.ListFacet._createFacetChoiceDom = function() {
    var div = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    
    copyChildren(document.getElementById("companion-facetChoiceTemplate"), div);
    
    return {
        div:    div,
        label:  div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[0],
        count:  div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "span")[0],
        action: div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "a")[1]
    };
};

window.mw.parallax.PivotPanelLayer._createPivotChoiceDom = function(label, count, title) {
    var div = mw.ui.createHTMLElement("div");
    div.className = "pivot-choice";
    div.title = title;
    
    var a = mw.ui.createHTMLElement("a");
    a.appendChild(document.createTextNode(label));
    a.href = "javascript:{}";
    div.appendChild(a);
    
    div.appendChild(document.createTextNode(" (" + count + ")"));
    
    return {
        div:    div,
        label:  div.firstChild
    };
};

window.mw.parallax.PivotPanelLayer._fillInDom = function(div) {
    div.innerHTML = "";

    copyChildren(document.getElementById("companion-pivotPanelTemplate"), div);
    
    var divs = div.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "div");

    var dom = {
        header:         divs[0],
        pivotContainer: divs[1],
        statusSection:  divs[2],
        footer:         divs[3]
    };
    dom.showMoreRelatedTopicsAction = dom.footer.childNodes[0];
    
    return dom;
};

window.MetawebSuite.core.JsonpQueue.prototype.call = function(url, onDone, onError, debug) {
    if (this._callInProgress == 0) {
        //document.body.style.cursor = "progress";
    }
    this._callInProgress++;
    
    var callbackID = new Date().getTime() + "x" + Math.floor(Math.random() * 1000);
    url += (url.indexOf("?") < 0 ? "?" : "&") + "callback=cb" + callbackID;
    
    var self = this;
    var cleanup = function() {
        self._callInProgress--;
        if (self._callInProgress == 0) {
            //document.body.style.cursor = "auto";
        }
        
        // the call might have been canceled, in which case its callback ID was removed.
        if (callbackID in self._pendingCallIDs) {
            delete self._pendingCallIDs[callbackID];
            return true;
        } else {
            return false;
        }
    };
    
    var callback = function(o) {
        if (cleanup()) {
            try {
                onDone(o);
            } catch (e) {
                mw.system.exception(e);
            }
        }
    };
    var error = function() {
        if (cleanup()) {
            if (typeof onError == "function") {
                try {
                    onError(url);
                } catch (e) {
                    mw.system.exception(e);
                }
            }
        }
    };
    
    this._pendingCallIDs[callbackID] = true;
    
    var request = new XMLHttpRequest();
    var stateChange = function() {
        if (request.readyState != 4) {
            return;
        }
        
        if (request.status != 200) {
            Companion.log(
                "Companion error: " +
                "state = " + request.readyState + 
                " status = " + request.status +
                " text = " + request.responseText
            );
            
            if (onError) {
                onError(request);
            }
            return;
        }
        
        if (onDone) {
            try {
                var env = {}
                env["cb" + callbackID] = callback;
                with (env) {
                    eval(request.responseText);
                }
            } catch (e) {
                Companion.exception(e);
                onError(request, e);
            }
        }
    };
    request.open("GET", url, true);
    request.onreadystatechange = stateChange;
    request.send("");
};
