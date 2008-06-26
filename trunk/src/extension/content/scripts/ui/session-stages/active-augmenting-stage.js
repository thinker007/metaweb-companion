Companion.PageSession.ActiveAugmentingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
	
	var self = this;
	this._collectionListener = {
        onItemsChanged: function() { self._highlightAugmentations(); }
    };
};

Companion.PageSession.ActiveAugmentingStage.prototype.installUserInterface = function() {
    var self = this;
    
    this._page = document.getElementById("companion-pageSession-activeAugmentingStagePage").cloneNode(true);
    
    this._dom = {};
    this._dom.analyzeButton = this._page.childNodes[0].childNodes[1];
    this._dom.analyzeButton.addEventListener('command', function(event) { self._pageSession.analyze(); }, true);
    
    this._dom.typeFacetContainer = this._page.getElementsByTagName("vbox")[0];
    this._dom.facetContainer = this._page.getElementsByTagName("scrollbox")[0];
	
    this._containerBox.appendChild(this._page);
    
    var spacer = document.createElement("spacer");
    spacer.style.height = "5px";
    this._dom.facetContainer.appendChild(spacer);
    
    this._listResults();
};

Companion.PageSession.ActiveAugmentingStage.prototype.uninstallUserInterface = function() {
    if (this._page != null) {
        this._containerBox.removeChild(this._page);
        this._page = null;
        this._dom = null;
    }
};

Companion.PageSession.ActiveAugmentingStage.prototype.dispose = function() {
	var collection = this._pageSession.collection;
	if (collection != null) {
		collection.removeListener(this._collectionListener);
	}
	
	this._removeAugmentations();
	this._removeAugmentingStyles();
};

Companion.PageSession.ActiveAugmentingStage.prototype._listResults = function() {
    if (this._dom == null) {
        return;
    }
	
    var database = this._pageSession.database;
	var collection = this._pageSession.collection;
	collection.addListener(this._collectionListener);
	
    this._addAugmentingStyles();
	this._addAugmentations();
	this._highlightAugmentations();
	
    /*
    var propertyListbox = this._dom.propertyListbox;
    var properties = database.getAllProperties();
    for (var i = 0; i < properties.length; i++) {
        var pID = properties[i];
        propertyListbox.appendItem(pID, pID);
    }
    */
	var config = {
		facetLabel:     "Types",
		expression:     ".type",
		filterable:     true,
		selectMultiple: true,
		sortable:       true,
		sortMode:       "value",
		sortDirection:  "forward",
		showMissing:    false,
		missingLabel:   "(No recipient)",
		fixedOrder: 	[]
	};
	this._createFacet(database, collection, "type-facet", config, this._dom.typeFacetContainer);
};

Companion.PageSession.ActiveAugmentingStage.prototype._getDocument = function() {
	return this._pageSession.windowSession.browser.contentDocument;
};

Companion.PageSession.ActiveAugmentingStage.prototype._addAugmentingStyles = function() {
	Companion.addAugmentingStyles(this._getDocument());
};

Companion.PageSession.ActiveAugmentingStage.prototype._removeAugmentingStyles = function() {
	Companion.removeAugmentingStyles(this._getDocument());
};

Companion.PageSession.ActiveAugmentingStage.prototype._addAugmentations = function() {
	var doc = this._getDocument();
	
	var detectionEntries = this._pageSession.detectionEntries;
	var detectionToIds = {};
	var detections = [];
	for (var i = 0; i < detectionEntries.length; i++) {
		var entry = detectionEntries[i];
        var rr = entry.freebaseReconciliationResult;
        if ("id" in rr) {
			var id = rr.id;
			
			var detections2 = entry.detections;
			for (var j = 0; j < detections2.length; j++) {
				var detection = detections2[j];
				var text = detection.text;
				if (!(text in detectionToIds)) {
					detectionToIds[text] = {};
					detections.push(text);
				}
				detectionToIds[text][id] = true;
			}
        }
	}
	detections.sort().reverse();
	
	var processElement = function(elmt) {
		var tagName = elmt.tagName;
		if (tagName == "script") {
			return;
		}
		
		var child = elmt.firstChild;
		while (child != null) {
			// processNode might change the child (such as removing it) so we need to save its next sibling first
			var nextChild = child.nextSibling;
			
			processNode(child);
			
			child = nextChild;
		}
	};
	
	var processTextNode = function(textNode) {
		var text = textNode.nodeValue;
		
		var i = 0;
		for (; i < detections.length; i++) {
			var detection = detections[i];
			if (detection.length <= text.length) {
				break;
			}
		}
		for (; i < detections.length; i++) {
			var detection = detections[i];
			var l = text.indexOf(detection);
			if (l >= 0) {
				var before = text.substr(0, l);
				var after = text.substr(l + detection.length);
				var parentNode = textNode.parentNode;
				
				var span = doc.createElement("span");
				span.className = Companion.augmentingStyles.detectionClass;
				span.appendChild(doc.createTextNode(detection));
				parentNode.insertBefore(span, textNode);
				
				var ids = [];
				for (var id in detectionToIds[detection]) {
					ids.push(id);
				}
				span.setAttribute("itemIDs", ids.join(";"));
				
				if (before.length > 0) {
					var beforeTextNode = doc.createTextNode(before);
					parentNode.insertBefore(beforeTextNode, span);
					processTextNode(beforeTextNode);
				}
				if (after.length > 0) {
					textNode.nodeValue = after;
					processTextNode(textNode);
				} else {
					parentNode.removeChild(textNode);
				}
				return;
			}
		}
	};
	
	var processNode = function(node) {
		switch (node.nodeType) {
		case 1:
			processElement(node);
			break;
		case 3:
			processTextNode(node);
			break;
		}
	};
	
	processNode(doc.body);
};

Companion.PageSession.ActiveAugmentingStage.prototype._removeAugmentations = function() {
	var doc = this._getDocument();
};

Companion.PageSession.ActiveAugmentingStage.prototype._highlightAugmentations = function() {Companion.log("here");
	var items = this._pageSession.collection.getRestrictedItems();Companion.log("here " + items.size());
	var doc = this._getDocument();
	var spans = doc.getElementsByTagName("span");
	
	for (var i = 0; i < spans.length; i++) {
		var span = spans[i];
		var classes = span.className;
		if (classes.indexOf(Companion.augmentingStyles.detectionClass) >= 0) {
			var found = false;
			var itemIDs = span.getAttribute("itemIDs");			
			itemIDs = itemIDs.split(";");
			
			for (var j = 0; j < itemIDs.length; j++) {
				if (items.contains(itemIDs[j])) {
					found = true;
					break;
				}
			}
			
			if (found) {
				span.className = Companion.augmentingStyles.detectionClass + " " + Companion.augmentingStyles.highlightClass;
			} else {
				span.className = Companion.augmentingStyles.detectionClass;
			}
		}
	}
};

Companion.PageSession.ActiveAugmentingStage.prototype._createFacet = 
		function(database, collection, name, config, box) {
		
    var facet = new Companion.ListFacet(
        name,
        database, 
        collection, 
        box, 
        config
    );    
    //Seek._facets.push(facet);
    //Seek._saveSettings();
    
    return facet;
};

Companion.PageSession.ActiveAugmentingStage.prototype._appendFacet = 
		function(database, collection, name, config) {
		
    var vbox = document.createElement("vbox");
    vbox.style.height = "17em";
	
    this._dom.facetContainer.insertBefore(vbox, this._dom.facetContainer.lastChild);
    
    this._dom.facetContainer.insertBefore(
		Seek.FacetUtilities.createFacetSplitter(), 
		this._dom.facetContainer.lastChild);
    
	return this._createFacet(database, collection, name, config, vbox);
};