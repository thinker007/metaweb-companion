Companion.WindowSession = function(browser) {
    this.browser = browser;
    
    this._windowSessionPage = null;
    this._dom = {};
    
    this._uiInitialized = false;
    this._keyToPageSession = {};
};

Companion.WindowSession.prototype.getCurrentPageSessionKey = function() {
    return this._browser.contentWindow.location.href;
};

Companion.WindowSession.prototype.getCurrentPageSession = function(create) {
    var key = this.getCurrentPageSessionKey();
    if (key in this._keyToPageSession) {
        return this._keyToPageSession[key];
    } else if (create) {
        var pageSession = new Companion.PageSession(this, key);
        this._keyToPageSession[key] = pageSession;
        return pageSession;
    } else {
        return null;
    }
};

Companion.WindowSession.prototype.showUserInterface = function() {
    if (!this._uiInitialized) {
        this._initializeUserInterface();
        this._uiInitialized = true;
    }
    
    var crossWindowDeck = document.getElementById("companion-crossWindowDeck");
    crossWindowDeck.selectedPanel = this._windowSessionPage;
}

Companion.WindowSession.prototype.hideUserInterface = function() {
}

Companion.WindowSession.prototype._initializeUserInterface = function() {
    var self = this;
    
    /*
     *  Create our panel.
     */
    var windowSessionPageTemplate = document.getElementById("companion-windowSessionPage-template");
    this._windowSessionPage = windowSessionPageTemplate.cloneNode(true);
    this._windowSessionPage.hidden = false;
    
    /*
     *  Retrieve references to inner elements.
     */
    this._dom.stageDeck = this._windowSessionPage.getElementsByTagName("deck")[0];
    this._dom.startStage = this._dom.stageDeck.getElementsByTagName("vbox")[0];
    this._dom.analyzeButton = this._dom.startStage.getElementsByTagName("button")[0];
    this._dom.typeListbox = this._dom.startStage.getElementsByTagName("listbox")[0];
    this._dom.propertyListbox = this._dom.startStage.getElementsByTagName("listbox")[1];
    
    /*
     *  Wire up event handlers.
     */
    this._dom.analyzeButton.addEventListener('command', function(event) { self._onAnalyzeCommand(); }, true);
    
    /*
     *  Add our panel to the common deck.
     */
    var crossWindowDeck = document.getElementById("companion-crossWindowDeck");
    crossWindowDeck.appendChild(this._windowSessionPage);
}

Companion.WindowSession.prototype._onAnalyzeCommand = function() {
    this._getOpenCalaisAnnotation();
};

Companion.WindowSession.prototype._getOpenCalaisAnnotation = function() {
    var self = this;
    
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
    processNode(this.browser.contentDocument.body);
    
    var text = textFragments.join("\n");
    OpenCalaisUtil.analyzeText(text, function(xmlDoc) {
        self._onOpenCalaisTextAnalysisResult(xmlDoc);
    });
};

Companion.WindowSession.prototype._onOpenCalaisTextAnalysisResult = function(xmlDoc) {
    var self = this;
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
            name:           normalizedName,
            freebaseTypes:  [],
            detections:     entity.detections
        };
        
        if (entity.entityType in OpenCalaisUtil.entityTypeMap) {
            entry.freebaseTypes = [].concat(OpenCalaisUtil.entityTypeMap[entity.entityType].freebaseTypes);
        }
        
        entries.push(entry);
    }
    
    FreebaseOracle.reconcile(
        entries, 
        function() { self._onDoneReconciliation(entries); }
    );
};

Companion.WindowSession.prototype._onDoneReconciliation = function(entries) {
    var self = this;
    
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
    
    FreebaseOracle.getAllRelationships(
        ids, 
        function(results) { self._onDoneGetAllRelationships(ids, results); }
    );
};

Companion.WindowSession.prototype._onDoneGetAllRelationships = function(ids, results) {
    Companion.log("Got " + results.length + " relationships");
    
    var typeListbox = this._dom.typeListbox;
    var propertyListbox = this._dom.propertyListbox;
    while (typeListbox.getRowCount() > 0) {
        typeListbox.removeItemAt(0);
    }
    while (propertyListbox.getRowCount() > 0) {
        propertyListbox.removeItemAt(0);
    }
    
    var properties = {};
    for (var i = 0; i < results.length; i++) {
        var r = results[i];
        properties[r.master_property] = true;
    }
    for (var n in properties) {
        propertyListbox.appendItem(n, n);
    }
    
    var database = Companion.Database.create();
    database.loadFreebaseItems(results);
    
    var items = new Companion.Set(ids);
    var types = database.getObjectsUnion(items, "type");
    types.visit(function(t) {
        var count = database.countDistinctSubjects(t, "type", items);
        var text = t + " (" + count + ")";
        typeListbox.appendItem(text, text);
    });
};
