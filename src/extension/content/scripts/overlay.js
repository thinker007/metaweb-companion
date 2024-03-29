var Companion = {
    _consoleService: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService)
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
    var selectedWindowSession = null;
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
            selectedWindowSession = companionWindowSession;
        } else if ("_companionWindowSession" in browser) {
            browser._companionWindowSession.onLostFocus();
        }
    }
    
    if (selectedWindowSession != null) {
        selectedWindowSession.onGotFocus();
    }
};

Companion._onCloseTab = function(event) {
    Companion.log(event);
    Companion.inspect(event);
};

Companion.activate = function() {
    Companion._getCurrentWindowSession().activate();
};

Companion._getCurrentWindowSession = function() {
    return Companion._getSelectedBrowser()._companionWindowSession;
};

Companion._getSelectedBrowser = function() {
    var tabBrowser = document.getElementById("content");
    var selectedIndex = tabBrowser.selectedTab.parentNode.selectedIndex;
    var browsers = tabBrowser.browsers;
    return browsers[selectedIndex];
};

Companion.isDatawebDocument = function(doc) {
    return doc.location.href.indexOf("dataweb:") == 0 ||
        doc.location.href.indexOf("chrome://companion/content/dataweb-commands/") == 0;
};

Companion.isMultiwebDocument = function(doc) {
    return doc.location.href.indexOf("multiweb:") == 0 ||
        doc.location.href.indexOf("chrome://companion/content/multiweb-commands/") == 0;
};

Companion.openSidePane = function() {
    document.getElementById("companion-sidePaneSplitter").hidden = false;
    document.getElementById("companion-sidePane").hidden = false;
};

Companion.closeSidePane = function() {
    document.getElementById("companion-sidePaneSplitter").hidden = true;
    document.getElementById("companion-sidePane").hidden = true;
};

Companion.addSidePaneContent = function(elmt) {
    var sidePane = document.getElementById("companion-sidePane");
    sidePane.insertBefore(elmt, sidePane.lastChild);
};

Companion.addTab = function(url) {
    var tabBrowser = document.getElementById("content");
    tabBrowser.selectedTab = tabBrowser.addTab(url);
};
