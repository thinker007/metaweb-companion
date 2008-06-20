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

Companion.exception = function(e) {
    this.log(e);
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
    OpenCalaisUtil.analyzeText(text, function(xmlDoc) {
        Companion._onOpenCalaisTextAnalysisResult(xmlDoc, browser)
    });
};

Companion._onOpenCalaisTextAnalysisResult = function(xmlDoc, browser) {
    //Companion.inspect(xmlDoc);
    
    var root = xmlDoc.firstChild.nextSibling;
    var entities = root.getElementsByTagName("Entities")[0].childNodes;
    var list = [];
    var map = {};
    for (var i = 0 ; i < entities.length ; i++) {
        var entityNode = entities[i];
        var entityType = entityNode.nodeName;
        
        var detectionNode = entityNode.getElementsByTagName("Detection")[0];
        var detection = {
            text:   detectionNode.firstChild.nodeValue,
            offset: parseInt(detectionNode.getAttribute("offset")),
            length: parseInt(detectionNode.getAttribute("length"))
        };
        
        var normalizedName;
        try {
            normalizedName = entityNode.getElementsByTagName(entityType)[0].firstChild.nodeValue;
        } catch (ex) {
            // Event & Fact (BUG!!!)
            normalizedName = detection.text;
        }
        
        if (normalizedName in map) {
            map[normalizedName].detections.push(detection);
        } else {
            map[normalizedName] = {
                entityType: entityType,
                detections: [ detection ]
            };
            list.push(normalizedName);
        }
    }
    
	var entries = [];
    for (var i = 0; i < list.length; i++) {
        var normalizedName = list[i];
        var entity = map[normalizedName];
		var entry = {
			name:			normalizedName,
			freebaseTypes:	[],
			detections:		entity.detections
		};
		
		if (entity.entityType in OpenCalaisUtil.entityTypeMap) {
			entry.freebaseTypes = [].concat(OpenCalaisUtil.entityTypeMap[entity.entityType].freebaseTypes);
		}
		
		entries.push(entry);
    }
	
	FreebaseOracle.reconcile(entries, function() {
	    var ids = [];
		for (var i = 0; i < entries.length; i++) {
			var entry = entries[i];
			var rr = entry.freebaseReconciliationResult;
			if ("id" in rr) {
			    ids.push(rr.id);
			} else {
				Companion.log(entry.name + " = unknown");
			}
		}
		FreebaseOracle.getAllRelationships(ids);
	});
};
