Companion.PageSession.ActivatingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
};

Companion.PageSession.ActivatingStage.prototype.installUserInterface = function() {
    var self = this;
    
    this._page = document.getElementById("companion-pageSession-activatingStagePage").cloneNode(true);
    
    this._dom = {};
    this._dom.logListbox = this._page.getElementsByTagName("listbox")[0];
    
    this._page.hidden = false;
    this._containerBox.appendChild(this._page);
};

Companion.PageSession.ActivatingStage.prototype.uninstallUserInterface = function() {
    if (this._page != null) {
        this._containerBox.removeChild(this._page);
        this._page = null;
        this._dom = null;
    }
};

Companion.PageSession.ActivatingStage.prototype.dispose = function() {
};

Companion.PageSession.ActivatingStage.prototype.kickstart = function() {
    this._getOpenCalaisAnnotation();
};

Companion.PageSession.ActivatingStage.prototype._getOpenCalaisAnnotation = function() {
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
    processNode(this._pageSession.windowSession.browser.contentDocument.body);
    
    var text = textFragments.join(" | ");
    OpenCalaisService.analyzeText(text, function(xmlDoc) {
        self._onOpenCalaisTextAnalysisResult(xmlDoc);
    });
};

Companion.PageSession.ActivatingStage.prototype._onOpenCalaisTextAnalysisResult = function(xmlDoc) {
    var self = this;
    //Companion.inspect(xmlDoc);
    
	var list = [];
	var map = {};
	
    var root = xmlDoc.firstChild.nextSibling;
	if (root) {
	    var entities = root.getElementsByTagName("Entities")[0].childNodes;
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
        
        if (entity.entityType in OpenCalaisService.entityTypeMap) {
            entry.freebaseTypes = [].concat(OpenCalaisService.entityTypeMap[entity.entityType].freebaseTypes);
        }
        
        entries.push(entry);
    }
    
    if (this._dom != null) {
        this._dom.logListbox.appendItem("Reconciling " + entries.length + " name(s) with Freebase...", "");
    }
    
    FreebaseService.reconcile(
        entries, 
        function() { self._onDoneReconciliation(entries); }
    );
};

Companion.PageSession.ActivatingStage.prototype._onDoneReconciliation = function(entries) {
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
	
	this._pageSession.detectionEntries = entries;
    
    if (this._dom != null) {
        this._dom.logListbox.appendItem("Retrieving relationships from Freebase...", "");
    }
    
    FreebaseService.getAllRelationships(
        ids, 
        function(results) { self._onDoneGetAllRelationships(ids, results); },
        (this._dom != null) ?
            function (s) { self._dom.logListbox.appendItem(s, s); } :
            function (s) {}
    );
};

Companion.PageSession.ActivatingStage.prototype._onDoneGetAllRelationships = function(ids, results) {
    var database = this._pageSession.database;
    database.loadFreebaseItems(results);
	
    if (this._dom != null) {
        this._dom.logListbox.appendItem("Retrieving schemas from Freebase...", "");
    }
	
	var self = this;
	FreebaseService.getTypeProperties(
		database.getAllTypes(),
		function(o) { self._onDoneGetTypeProperties(o, ids); });
};

Companion.PageSession.ActivatingStage.prototype._onDoneGetTypeProperties = function(typePropertyEntries, ids) {
    var database = this._pageSession.database;
    
    var typeProperties = {};
    for (var i = 0; i < typePropertyEntries.length; i++) {
        var typePropertyEntry = typePropertyEntries[i];
        var propertyEntries = typePropertyEntry["/type/type/properties"];
        var propertyIDs = [];
        
        for (var j = 0; j < propertyEntries.length; j++) {
            var propertyEntry = propertyEntries[j];
            propertyIDs.push(propertyEntry.id);
            
            var propertyRecord = database.getProperty(propertyEntry.id);
            if (propertyRecord != null) {
                propertyRecord._label = propertyRecord._pluralLabel = propertyEntry.name;
                
                if ("expected_type" in propertyEntry) {
                    var expectedTypes = propertyEntry["expected_type"];
                    if (expectedTypes.length > 0) {
                        propertyRecord._expectedTypeLabel = expectedTypes[0].name;
                    }
                }
            }
        }
        typeProperties[typePropertyEntry.id] = propertyIDs;
    }

    this._pageSession.augment(typeProperties, ids);
};
