var Companion = {};

Companion.log = function(msg) {
    this._consoleService.logStringMessage(msg);
};

Companion.exception = function(e) {
    this.log(e);
};

Companion.inspect = function(o) {
    window.openDialog("chrome://inspector/content/inspector.xul", "inspector", "chrome,width=800,height=600,all", o);
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

Companion.onMenuItemCommand = function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
};

