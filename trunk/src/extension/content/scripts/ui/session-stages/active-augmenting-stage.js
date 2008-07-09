Companion.PageSession.ActiveAugmentingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
	this._contentHighlighter = null;
	
	this._facetPaths = [];
	this._facets = [];
    this._typeFacet = null;
	
	var self = this;
	this._collectionListener = {
        onItemsChanged: function() { self._onItemsChanged(); }
    };
};

Companion.PageSession.ActiveAugmentingStage.prototype.installUserInterface = function() {
    var self = this;
    
    this._page = document.getElementById("companion-pageSession-activeAugmentingStagePage").cloneNode(true);
    
    this._dom = {};
	
	var linkList = this._page.childNodes[0].childNodes[0].childNodes[0].getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "li");
	this._dom.browseTopicsAloneLink = linkList[0].firstChild;
	this._dom.browseTopicsAloneLink.addEventListener('click', function(event) { self._onClickBrowseTopicsAloneLink(); }, true);
	this._dom.findMoreNewsLink = linkList[1].firstChild;
	this._dom.findMoreNewsLink.addEventListener('click', function(event) { self._onClickFindMoreNewsLink(); }, true);
    
    this._dom.analyzeButton = this._page.childNodes[0].childNodes[1].childNodes[0];
    this._dom.analyzeButton.addEventListener('command', function(event) { self._pageSession.analyze(); }, true);
    
    this._dom.typeFacetContainer = this._page.getElementsByTagName("vbox")[2];
    
    this._dom.facetOuterDeck = this._page.lastChild;
    
    this._dom.resetAllLink = this._dom.facetOuterDeck.childNodes[1].childNodes[0].childNodes[1];//.childNodes[0];
    this._dom.resetAllLink.addEventListener('click', function(event) { self._onClickResetAllLink(); }, true);
	
    this._dom.facetList = this._dom.facetOuterDeck.childNodes[1].childNodes[1].childNodes[0];
    this._dom.facetList.addEventListener('select', function(event) { self._onSelectFacetList(); }, true);
    this._dom.facetDeck = this._dom.facetOuterDeck.childNodes[1].childNodes[1].childNodes[2];
	
    this._containerBox.appendChild(this._page);
    
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
	if (this._contentHighlighter != null) {
		this._contentHighlighter.dispose();
		this._contentHighlighter = null;
	}
	
	var collection = this._pageSession.collection;
	if (collection != null) {
		collection.removeListener(this._collectionListener);
	}
	this._collectionListener = null;
	
	if (this._typeFacet != null) {
		this._typeFacet.dispose();
		this._typeFacet = null;
	}
	
	for (var i = 0; i < this._facets.length; i++) {
		this._facets[i].dispose();
	}
	this._facets = null;
};

Companion.PageSession.ActiveAugmentingStage.prototype._listResults = function() {
    if (this._dom == null) {
        return;
    }
	
    var database = this._pageSession.database;
	var collection = this._pageSession.collection;
	collection.addListener(this._collectionListener);
	
	this._highlightContent();
	
    var facetLabel = document.getElementById("companion-strings").
        getString("companion.pageSession.activeAugmentingStagePage.filterByTypes.label");
        
	var self = this;
	var config = {
		facetLabel:           facetLabel,
        expectedTypeLabel:    "types",
		expression:           ".type",
		filterable:           true,
		selectMultiple:       true,
		sortable:             true,
		sortMode:             "count",
		sortDirection:        "forward",
		showMissing:          false,
		fixedOrder: 	      [],
		slideFreebase:        function(fbids) { self._slideFreebase(fbids); }
	};
	this._typeFacet = this._createFacet(database, collection, "type-facet", config, this._dom.typeFacetContainer);
};

Companion.PageSession.ActiveAugmentingStage.prototype._onSelectFacetList = function() {
    var i = this._dom.facetList.selectedIndex;
    if (i < 0) {
        this._dom.facetDeck.selectedIndex = this._dom.facetDeck.childNodes.length - 1;
    } else {
        this._dom.facetDeck.selectedIndex = i;
    }
};

Companion.PageSession.ActiveAugmentingStage.prototype._onItemsChanged = function() {try {
	this._highlightContent();

    var database = this._pageSession.database;
	var collection = this._pageSession.collection;
	var freebaseModel = this._pageSession.freebaseModel;
	
    var hasRestrictions = this._typeFacet.hasRestrictions();
    for (var i = 0; !hasRestrictions && i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            hasRestrictions = true;
        }
    }
    this._dom.resetAllLink.style.display = hasRestrictions ? "block" : "none";
    
    var newPaths = {};
    if (hasRestrictions) {
		var nativeTypes = {
			'/type/int': true,
			'/type/float': true,
			'/type/boolean': true,
			'/type/rawstring': true,
			'/type/uri': true,
			'/type/datetime': true,
			'/type/bytestring': true,
			//'/type/key': true,
			'/type/value': true,
			'/type/text': true,
			'/type/enumeration':true,
		};
		var processPropertyID = function(propertyID, outer, outerLabel) {
			if (propertyID.indexOf("/common/") != 0) {
				var propertyRecord = database.getProperty(propertyID);
				if (propertyRecord == null) {
					return;
				}
				if (("_expectedType" in propertyRecord) && (propertyRecord._expectedType in nativeTypes)) {
					return;
				}
				
				if (("_isCVT" in propertyRecord) && propertyRecord._isCVT) {
					var typeID = propertyRecord._expectedType;
					processTypeID(
						typeID, 
						outer + "." + propertyID,
						outerLabel + 
							(("_expectedTypeLabel" in propertyRecord) ? propertyRecord._expectedTypeLabel : "related things") + 
							"/"
					);
				} else {
					newPaths[outer + "." + propertyID] = outerLabel + propertyRecord._label;
				}
			}
		};
		
		var processTypeID = function(typeID, outer, outerLabel) {
    		var properties = freebaseModel.getPropertiesOfType(typeID);
    		if (properties) {
    			for (var i = 0; i < properties.length; i++) {
    				processPropertyID(properties[i], outer, outerLabel);
    			}
    		}
		};
		
    	var items = collection.getRestrictedItems();
    	var types = database.getObjectsUnion(items, "type");
    	types.visit(function(typeID) { processTypeID(typeID, "", ""); });
	}
    
	for (var i = this._facetPaths.length - 1; i >= 0; i--) {
		var facetPath = this._facetPaths[i];
		if (facetPath in newPaths) {
			delete newPaths[facetPath];
		} else {
			if (!this._facets[i].hasRestrictions()) {
				this._facets[i].dispose();
				this._facets.splice(i, 1);
				this._facetPaths.splice(i, 1);
				
                this._dom.facetList.removeItemAt(i);
                this._dom.facetDeck.removeChild(this._dom.facetDeck.childNodes[i]);
			}
		}
	}
	
	var self = this;
	for (var newPath in newPaths) {
		var dot = newPath.lastIndexOf(".");
		var propertyID = newPath.substr(dot + 1);
		
		var propertyRecord = database.getProperty(propertyID);
		if (propertyRecord == null) {
			Companion.log("Unknown property " + propertyID);
			continue;
		}
		
		var label = propertyRecord.getLabel();
		var expectedTypeLabel = ("_expectedTypeLabel" in propertyRecord) ? 
			propertyRecord._expectedTypeLabel : "related things";
			
		var config = {
			facetLabel:         newPaths[newPath],
			expectedTypeLabel:  expectedTypeLabel,
			expression:         newPath,
			filterable:         true,
			selectMultiple:     true,
			sortable:           true,
			sortMode:           "value",
			sortDirection:      "forward",
			showMissing:        true,
			missingLabel:       "(missing value)",
			fixedOrder: 	    [],
			slideFreebase:      function(fbids) { self._slideFreebase(fbids); }
		};
		var facet = this._appendFacet(database, collection, newPath + "-facet", config);
		this._facets.push(facet);
		this._facetPaths.push(newPath);
	}
    
    if (this._dom.facetList.selectedIndex == -1 && this._facets.length > 0) {
        this._dom.facetList.selectedIndex = 0;
    }
    this._dom.facetOuterDeck.selectedIndex = (this._facets.length > 0) ? 1 : 0;} catch (e) {Companion.log(e);}
};

Companion.PageSession.ActiveAugmentingStage.prototype._getDocument = function() {
	return this._pageSession.windowSession.browser.contentDocument;
};

Companion.PageSession.ActiveAugmentingStage.prototype._highlightContent = function() {
	var doc = this._getDocument();
	if (this._contentHighlighter == null) {
		var focusURLGenerator = function(itemIDs) { return "http://freebase.com/view" + itemIDs[0]; };
		
		if (Companion.isDatawebDocument(doc)) {
			this._contentHighlighter = new Companion.DatawebContentHighlighter(focusURLGenerator);
		} else if (Companion.isMultiwebDocument(doc)) {
			this._contentHighlighter = new Companion.MultiwebContentHighlighter(
				this._pageSession.identityModel, focusURLGenerator);
		} else {
			this._contentHighlighter = new Companion.SinglePageContentHighlighter(
				this._pageSession.identityModel, focusURLGenerator);
		}
	}
	this._contentHighlighter.setDocument(this._getDocument());
	this._contentHighlighter.highlight(this._pageSession.collection.getRestrictedItems());
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
    return facet;
};

Companion.PageSession.ActiveAugmentingStage.prototype._appendFacet = 
		function(database, collection, name, config) {
		
    var vbox = document.createElement("vbox");
    vbox.style.height = "17em";
    vbox.className = "companion-facet-box";
	
    this._dom.facetList.appendItem(config.facetLabel, config.facetLabel);
    this._dom.facetDeck.insertBefore(vbox, this._dom.facetDeck.lastChild);
    
	return this._createFacet(database, collection, name, config, vbox);
};

Companion.PageSession.ActiveAugmentingStage.prototype._onClickResetAllLink = function() {
    var collection = this._pageSession.collection;
    collection.clearAllRestrictions();
};

Companion.PageSession.ActiveAugmentingStage.prototype._slideFreebase = function(fbids) {
	var url = 
		//"dataweb:browse" +
		"chrome://companion/content/dataweb-commands/browse-inner.xul" +
		"?fbids=" + encodeURIComponent(fbids.join(";"));
	this._pageSession.windowSession.browser.setAttribute("src", url);
};

Companion.PageSession.ActiveAugmentingStage.prototype._onClickBrowseTopicsAloneLink = function() {
    var collection = this._pageSession.collection;
	var fbids = collection.getRestrictedItems().toArray();
	this._browseTo(
		//"dataweb:browse" +
		"chrome://companion/content/dataweb-commands/browse-inner.xul" +
		"?fbids=" + encodeURIComponent(fbids.join(";")));
};

Companion.PageSession.ActiveAugmentingStage.prototype._onClickFindMoreNewsLink = function() {
    var collection = this._pageSession.collection;
	var items = collection.getRestrictedItems();
	var labels = this._pageSession.database.getObjectsUnion(items, "label").toArray();
	
	var self = this;
	var onDone = function(urls) {
		for (var i = 0; i < urls.length; i++) {
			urls[i] = "u=" + encodeURIComponent(urls[i]);
		}
		self._browseTo(
			//"multiweb:browse" +
			"chrome://companion/content/multiweb-commands/browse-inner.xul" +
			"?" + urls.join("&"));
	};
	var onStatus = function(s) {
		Companion.log(s);
	};
	var onError = function(s) {
		alert("Error: " + s);
	};
	
	GoogleNewsService.getNews(labels, 1, onDone, onStatus, onError);
};

Companion.PageSession.ActiveAugmentingStage.prototype._browseTo = function(url) {
	this._pageSession.windowSession.browser.setAttribute("src", url);
};
