var Companion = {};
window.addEventListener("load", function(e) { Companion.onLoad(e); }, false);

Companion.onLoad = function() {
    // initialization code
    this.initialized = true;
    this.strings = document.getElementById("companion-strings");
    this._consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
};

Companion.log = function(msg) {
    this._consoleService.logStringMessage(msg);
};

Companion.onMenuItemCommand = function(e) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window, this.strings.getString("helloMessageTitle"),
                                this.strings.getString("helloMessage"));
};

Companion.onAnalyzeCommand = function() {
    var browser = document.getElementById("content").selectedBrowser;
    Companion._getOpenCalaisAnnotation(browser);
};

Companion._getOpenCalaisAnnotation = function(browser) {
    var textFragments = [];
    
    var processNode = function(node) {
        switch (node.nodeType) {
        case 3: // text node
            textFragments.push(node.nodeValue);
            break;
        case 1: // element
            var nodeName = node.nodeName.toLowerCase();
            switch (nodeName) {
            case "script":
            case "input":
            case "button":
            case "option":
            case "select":
                return; // ignore
            }
            var childNode = node.firstChild;
            while (childNode != null) {
                processNode(childNode);
                childNode = childNode.nextSibling;
            }
            break; 
        }
    };
    processNode(browser.contentDocument.body);
    
    var text = textFragments.join("\n");
    
    var request = new XMLHttpRequest();
	request.open("POST", "http://sws.clearforest.com/ws/sws.asmx/TagIT", true);
	request.onreadystatechange = function() { Companion._stateChangeCallback(request); };
	request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	request.setRequestHeader('User-Agent', 'Gnosis (compatible; Mozilla 5.0, Yoav Gever)');
	request.send("UID=0&content=" + escape(text) + "&typeID=1");
};

Companion._stateChangeCallback = function(request) {
    if (request.readyState != 4) {
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "Companion error: " +
            "state = " + request.readyState + 
            " status = " + request.status
        );
        return;
    }
    
    var textNode = request.responseXML.firstChild.firstChild;
    var xmlstr = "";
    while (textNode != null) {
        xmlstr += textNode.nodeValue;
        textNode = textNode.nextSibling;
    }
    
    Companion.log(xmlstr);
};
