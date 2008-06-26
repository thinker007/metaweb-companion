var Companion = {
	sidepaneHidden: true,
	augmentingStyles: {
		styleID: 		"metawebCompanion-style",
		detectionClass: "metawebCompanion-detection",
		highlightClass: "metawebCompanion-highlight"
	}
};



Companion.log = function(msg) {
    this._consoleService.logStringMessage(msg);
};

Companion.exception = function(e) {
    this.log(e);
};

Companion.inspect = function(o) {
    window.openDialog("chrome://inspector/content/inspector.xul", "inspector", "chrome,width=800,height=600,all", o);
};

Companion.cancelEvent = function(evt) {
    evt.returnValue = false;
    evt.cancelBubble = true;
    if ("preventDefault" in evt) {
        evt.preventDefault();
    }
    return false;
};

window.addEventListener("load", function(e) { Companion.onLoad(e); }, false);
Companion.onLoad = function() {
    this.strings = document.getElementById("companion-strings");
    this._consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    
    var tabBrowser = document.getElementById("content");
    var tabs = tabBrowser.selectedTab.parentNode;
    tabs.addEventListener('select', Companion._onSelectTab, true);
    //tabs.addEventListener('closetab', Companion._onCloseTab, true);
    //We need to figure out how to dispose the session when a tab gets closed?
    
    Companion._onSelectTab();
};

Companion._onSelectTab = function(event) {
    var tabBrowser = document.getElementById("content");
    var selectedIndex = tabBrowser.selectedTab.parentNode.selectedIndex;
    
    var browsers = tabBrowser.browsers;
    for (var i = 0; i < browsers.length; i++) {
        var browser = tabBrowser.browsers[i];
        if (i == selectedIndex) {
            var companionWindowSession;
	        if ("_companionWindowSession" in browser) {
	            companionWindowSession = browser._companionWindowSession;
	        } else { 
	            companionWindowSession = new Companion.WindowSession(browser);
                browser._companionWindowSession = companionWindowSession;
            }
            
            companionWindowSession.showUserInterface();
        } else if ("_companionWindowSession" in browser) {
            browser._companionWindowSession.hideUserInterface();
        }
    }
};

Companion._onCloseTab = function(event) {
    Companion.log(event);
    Companion.inspect(event);
};

Companion.toggleSidepane = function() {
	Companion.sidepaneHidden = !Companion.sidepaneHidden;
	
	document.getElementById("companion-sidePaneSplitter").hidden = Companion.sidepaneHidden;
	document.getElementById("companion-sidePane").hidden = Companion.sidepaneHidden;
	document.getElementById("companion-toggleSidepane-cmd").
		setAttribute("checked", !Companion.sidepaneHidden);
};

Companion.addAugmentingStyles = function(doc) {
    var style = doc.getElementById(Companion.augmentingStyles.styleID);
    if (!style) {
        var head = doc.getElementsByTagName("head").item(0);
        if (head) {
            style = doc.createElement("style");
        } else {
            head = doc.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "head").item(0);
            style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
        }
        
        style.id = Companion.augmentingStyles.styleID;
        style.innerHTML = 
          "." + Companion.augmentingStyles.detectionClass + " {}\n" +
          "." + Companion.augmentingStyles.highlightClass + " { background-color: #ffff80; cursor: pointer; }";
        
        head.appendChild(style);
    }
};

Companion.removeAugmentingStyles = function(doc) {
    var style = doc.getElementById(Companion.augmentingStyles.styleID);
    if (style) {
		style.parentNode.removeChild(style);
    }
};