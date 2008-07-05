Companion.EntityIdentificationProcess = function(doc, identityModel, ui, settings) {
	this._doc = doc;
	this._identityModel = identityModel;
	
	this._ui = ui;
	this._settings = settings;
	this._normalizedNameToManifestations = {};
	
	this._running = false;
	this._cancel = false;
};

Companion.EntityIdentificationProcess.prototype.start = function(onDone, onError) {
	this._onDone = onDone || function() {};
	this._onError = onError || function() {}
	this._running = true;
	
	this._getOpenCalaisAnnotation();
};

Companion.EntityIdentificationProcess.prototype.cancel = function() {
	this._cancel = true;
};

Companion.EntityIdentificationProcess.prototype._getOpenCalaisAnnotation = function() {
    this._ui.debugLog("Analyzing text using OpenCalais...");
    
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
    processNode(this._doc.body);
    
    var text = textFragments.join(" | ");
    OpenCalaisService.analyzeText(
		text, 
		function(xmlDoc) {
			self._onOpenCalaisTextAnalysisResult(xmlDoc);
		},
		function(request) {
			self._notifyError(request.statusText);
		}
	);
};

Companion.EntityIdentificationProcess.prototype._onOpenCalaisTextAnalysisResult = function(xmlDoc) {
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
	        var manifestation = {
	            //offset: parseInt(detectionNode.getAttribute("offset")),
	            //length: parseInt(detectionNode.getAttribute("length")),
	            text:   detectionNode.firstChild.nodeValue
	        };
	        
	        var normalizedName;
	        try {
	            normalizedName = entityNode.getElementsByTagName(entityType)[0].firstChild.nodeValue;
	        } catch (ex) {
	            // Event & Fact (BUG!!!)
	            normalizedName = detection.text;
	        }
	        
	        if (normalizedName in map) {
	            map[normalizedName].manifestations.push(manifestation);
	        } else {
	            map[normalizedName] = {
	                entityType: 	entityType,
	                manifestations: [ manifestation ]
	            };
	            list.push(normalizedName);
	        }
	    }
	}
	
    var entries = [];
    for (var i = 0; i < list.length; i++) {
        var normalizedName = list[i];
        var entity = map[normalizedName];
		
		this._normalizedNameToManifestations[normalizedName] = entity.manifestations;
		
        var entry = {
            name:           normalizedName,
            freebaseTypes:  []
        };
        if (entity.entityType in OpenCalaisService.entityTypeMap) {
            entry.freebaseTypes = [].concat(OpenCalaisService.entityTypeMap[entity.entityType].freebaseTypes);
        }
        
        entries.push(entry);
    }
    
    this._ui.debugLog("Reconciling " + entries.length + " name(s) with Freebase...");
    
    FreebaseService.reconcile(
        entries, 
        function() { 
			self._onDoneReconciliation(entries); 
		},
		function(request) {
			self._notifyError(request.statusText);
		}
    );
};

Companion.EntityIdentificationProcess.prototype._onDoneReconciliation = function(entries) {
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var rr = entry.freebaseReconciliationResult;
        if ("id" in rr) {
			this._identityModel.addEntityWithFreebaseID(
				rr.id, 
				entry.name, 
				this._normalizedNameToManifestations[entry.name]
			);
        } else {
            this._ui.debugLog("Freebase does not know about " + entry.name);
        }
    }
	
    this._onDone();
};

Companion.EntityIdentificationProcess.prototype._notifyError = function(s) {
	this._onError(s);
};
