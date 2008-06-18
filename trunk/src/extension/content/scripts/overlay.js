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

Companion.inspect = function(o) {
    window.openDialog("chrome://inspector/content/inspector.xul", "inspector", "chrome,width=600,height=300", o);
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
    OpenCalaisUtil.analyzeText(text, Companion._onOpenCalaisTextAnalysisResult);
};

Companion._onOpenCalaisTextAnalysisResult = function(xmlDoc) {
    Companion.inspect(xmlDoc);
    
    var root = xmlDoc.firstChild.nextSibling;
    var entities = root.getElementsByTagName("Entities")[0].childNodes;
    var done = {};
    for (var i = 0 ; i < entities.length ; i++) {
        var entityNode = entities[i];
        var entityType = entityNode.nodeName;
        var detectedText = entityNode.getElementsByTagName("Detection")[0].firstChild.nodeValue;
        
        if (done[detectedText]) {
            continue;
        } else {
            done[detectedText] = "OK";
        }
        
        var entityNormalizedText;
        try {
            entityNormalizedText = entityNode.getElementsByTagName(entityType)[0].firstChild.nodeValue;
        } catch (ex) {
            // Event & Fact (BUG!!!)
            entityNormalizedText = detectedText;
        }
        
        Companion.log(entityType + ": " + entityNormalizedText + " (" + detectedText + ")");
    }
};
