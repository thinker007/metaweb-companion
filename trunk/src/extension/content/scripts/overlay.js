var Companion = {
	sidepaneHidden: true
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

Companion.getHelperURL = function() {
    var url = "http://localhost:8192/";
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	try {
		url = prefs.getCharPref("metaweb.companion.helper");
	} catch (e) {
	}
	return url;
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

Companion.isDatawebDocument = function(doc) {
	return doc.location.href.indexOf("dataweb:") == 0 ||
		doc.location.href.indexOf("chrome://companion/content/dataweb-commands/") == 0;
};

Companion.isMultiwebDocument = function(doc) {
	return doc.location.href.indexOf("multiweb:") == 0 ||
		doc.location.href.indexOf("chrome://companion/content/multiweb-commands/") == 0;
};
