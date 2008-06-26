Companion.PageSession.ActiveAugmentingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
	this._facetProperties = [];
	this._facets = [];
	
	var self = this;
	this._collectionListener = {
        onItemsChanged: function() { self._onItemsChanged(); }
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

Companion.PageSession.ActiveAugmentingStage.prototype._onItemsChanged = function() {
	this._highlightAugmentations();
	
    var database = this._pageSession.database;
	var collection = this._pageSession.collection;
	var typeProperties = this._pageSession.typeProperties;
	
	var items = collection.getRestrictedItems();
	var types = database.getObjectsUnion(items, "type");
	var newProperties = {};
	types.visit(function(typeID) {
		var properties = typeProperties[typeID];
		if (properties) {
			for (var i = 0; i < properties.length; i++) {
				var propertyID = properties[i];
				if (properties[i].indexOf("/common/") != 0) {
					newProperties[properties[i]] = true;
				}
			}
		}
	});
	
	var facetContainer = this._dom.facetContainer;
	for (var i = this._facetProperties.length - 1; i >= 0; i--) {
		var facetProperty = this._facetProperties[i];
		if (facetProperty in newProperties) {
			delete newProperties[facetProperty];
		} else {
			if (!this._facets[i].hasRestrictions()) {
				this._facets[i].dispose();
				this._facets.splice(i, 1);
				this._facetProperties.splice(i, 1);
				
				facetContainer.removeChild(facetContainer.childNodes[i*2]); // the facet box
				facetContainer.removeChild(facetContainer.childNodes[i*2]); // splitter
			}
		}
	}
	
	for (var propertyID in newProperties) {
		if (database.countDistinctObjectsUnion(items, propertyID) > 1) {
			var config = {
				facetLabel:     propertyID,
				expression:     "." + propertyID,
				filterable:     true,
				selectMultiple: true,
				sortable:       true,
				sortMode:       "value",
				sortDirection:  "forward",
				showMissing:    true,
				missingLabel:   "(missing value)",
				fixedOrder: 	[]
			};
			var facet = this._appendFacet(database, collection, propertyID + "-facet", config);
			this._facets.push(facet);
			this._facetProperties.push(propertyID);
		}
	}
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
	
	var ignore = { 
		"i":true, "you":true, "he":true, "she":true, "it":true, "we":true, "they":true, 
		"me":true, "him":true, "her":true, "us":true, "them":true,
		"his":true, "hers":true, "mine":true, "yours":true, "ours":true, "theirs":true
	};
	
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
				if (text.toLowerCase() in ignore) {
					continue;
				}
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

Companion.PageSession.ActiveAugmentingStage.prototype._highlightAugmentations = function() {
	var items = this._pageSession.collection.getRestrictedItems();
	var doc = this._getDocument();
	var spans = doc.getElementsByTagName("span");
	var spansToHighlight = [];
	
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
				spansToHighlight.push(span);
			} else {
				span.className = Companion.augmentingStyles.detectionClass;
			}
		}
	}
	
	this._showTargetCircles(doc, spansToHighlight);
};

Companion.PageSession.ActiveAugmentingStage.prototype._showTargetCircles = function(doc, elmts) {
	var containerID = "metawebCompanion-targetCircleContainer";
	var containerDiv = doc.getElementById(containerID);
	if (!(containerDiv)) {
		containerDiv = doc.createElement("div");
		containerDiv.id = containerID;
		containerDiv.style.position = "absolute";
		containerDiv.style.top = "0px";
		containerDiv.style.left = "0px";
		containerDiv.style.width = doc.body.scrollWidth + "px";
		containerDiv.style.height = doc.body.scrollHeight + "px";
		containerDiv.style.zIndex = 1000;
		doc.body.appendChild(containerDiv);
	}
	containerDiv.innerHTML = '<div style="position: relative; width: 100%; height: 100%; overflow: hidden"></div>';
	
	var minTop = doc.body.scrollHeight;
	var maxTop = 0;
	
	var scrollTop = doc.body.scrollTop;
	var scrollLeft = doc.body.scrollLeft;
	for (var i = 0; i < elmts.length; i++) {
		try {
			var elmt = elmts[i];
			var rect = elmt.getClientRects().item(0);
			var top = scrollTop + Math.ceil((rect.top + rect.bottom) / 2 - 50);
			var left = scrollLeft + Math.ceil((rect.left + rect.right) / 2 - 50);
			
			minTop = Math.min(minTop, top);
			maxTop = Math.max(maxTop, top);
			
			var img = doc.createElement("img");
			img.src = "http://metaweb-companion.googlecode.com/svn/trunk/src/extension/skin/images/target-circle.png";
			//img.src = "chrome://companion/skin/images/target-circle.png";
			img.style.position = "absolute";
			img.style.top = top + "px";
			img.style.left = left + "px";
			
			containerDiv.firstChild.appendChild(img);
		} catch (e) {}
	}
	
	if (minTop >= scrollTop + doc.body.clientHeight) { // need to scroll down
		doc.body.scrollTop = Math.min(doc.body.scrollHeight - doc.body.clientHeight, minTop - 100);
	} else if (maxTop < scrollTop) { // need to scroll up
		doc.body.scrollTop = Math.max(0, maxTop - (doc.body.clientHeight - 100));
	}
	
	containerDiv.style.display = "block";
	
	window.setTimeout(function() {
		containerDiv.style.display = "none";
	}, 1200);
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
		Companion.FacetUtilities.createFacetSplitter(), 
		this._dom.facetContainer.lastChild);
    
	return this._createFacet(database, collection, name, config, vbox);
};
