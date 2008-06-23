Companion.PageSession = function(windowSession, box) {
    this._windowSession = windowSession;
    this._containerBox = box;
    
    this._pageHasFocus = false;
    this._stage = Companion.PageSession.STAGE_START;
    
    this._page = null;
    this._dom = null;
    
    this._isQuery = false;
    this._query = null;
    this._uris = null;
    
    this._database = null;
    this._typeSelection = [];
    this._facets = [];
};

Companion.PageSession.STAGE_START = 0;
Companion.PageSession.STAGE_ACTIVATING = 1;
Companion.PageSession.STAGE_ACTIVE_AUGMENTING = 2;
    
Companion.PageSession.prototype.installUserInterface = function() {
    this._pageHasFocus = true;
    this._internalInstallUserInterface();
};

Companion.PageSession.prototype.uninstallUserInterface = function() {
    this._pageHasFocus = false;
    this._internalUninstallUserInterface();
};

Companion.PageSession.prototype._internalInstallUserInterface = function() {
    var self = this;
    
    this._dom = {};
    
    switch (this._stage) {
    case Companion.PageSession.STAGE_START:
        this._page = document.getElementById("companion-pageSession-startStagePage").cloneNode(true);
        
        this._dom.analyzeButton = this._page.childNodes[2].childNodes[0];
        this._dom.analyzeButton.addEventListener('command', function(event) { self._onAnalyzeCommand(); }, true);
        break;
    
    case Companion.PageSession.STAGE_ACTIVATING:
        this._page = document.getElementById("companion-pageSession-activatingStagePage").cloneNode(true);
        this._dom.logListbox = this._page.getElementsByTagName("listbox")[0];
        break;
        
    case Companion.PageSession.STAGE_ACTIVE_AUGMENTING:
        this._page = document.getElementById("companion-pageSession-activeAugmentingStagePage").cloneNode(true);
        
        this._dom.analyzeButton = this._page.childNodes[0].childNodes[1];
        this._dom.analyzeButton.addEventListener('command', function(event) { self._onAnalyzeCommand(); }, true);
        
        this._dom.typeListbox = this._page.getElementsByTagName("listbox")[0];
        this._dom.propertyListbox = this._page.getElementsByTagName("listbox")[1];
        break;
    }
    
    this._page.hidden = false;
    this._containerBox.appendChild(this._page);
};

Companion.PageSession.prototype._internalUninstallUserInterface = function() {
    if (this._page != null) {
        this._containerBox.removeChild(this._page);
        this._page = null;
        this._dom = null;
    }
};

Companion.PageSession.prototype._switchStage = function(newStage) {
    if (this._pageHasFocus) {
        this._internalUninstallUserInterface();
    }
    
    this._stage = newStage;
    
    if (this._pageHasFocus) {
        this._internalInstallUserInterface();
    }
};

Companion.PageSession.prototype._onAnalyzeCommand = function() {
    this._switchStage(Companion.PageSession.STAGE_ACTIVATING); 
    this._getOpenCalaisAnnotation();
};

Companion.PageSession.prototype._getOpenCalaisAnnotation = function() {
    if (this._dom != null) {
        this._dom.logListbox.appendItem("Analyzing text using OpenCalais...", "");
    }
    
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
    processNode(this._windowSession.browser.contentDocument.body);
    
    var text = textFragments.join("\n");
    OpenCalaisUtil.analyzeText(text, function(xmlDoc) {
        self._onOpenCalaisTextAnalysisResult(xmlDoc);
    });
};

Companion.PageSession.prototype._onOpenCalaisTextAnalysisResult = function(xmlDoc) {
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
    
    if (this._dom != null) {
        this._dom.logListbox.appendItem("Reconciling " + entries.length + " name(s) with Freebase...", "");
    }
    
    FreebaseOracle.reconcile(
        entries, 
        function() { self._onDoneReconciliation(entries); }
    );
};

Companion.PageSession.prototype._onDoneReconciliation = function(entries) {
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
    
    if (this._dom != null) {
        this._dom.logListbox.appendItem("Retrieving relationships from Freebase...", "");
    }
    
    FreebaseOracle.getAllRelationships(
        ids, 
        function(results) { self._onDoneGetAllRelationships(ids, results); },
        (this._dom != null) ?
            function (s) { self._dom.logListbox.appendItem(s, s); } :
            function (s) {}
    );
};

Companion.PageSession.prototype._onDoneGetAllRelationships = function(ids, results) {
    Companion.log("Got " + results.length + " relationships");
    
    this._switchStage(Companion.PageSession.STAGE_ACTIVE_AUGMENTING); 
    
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
