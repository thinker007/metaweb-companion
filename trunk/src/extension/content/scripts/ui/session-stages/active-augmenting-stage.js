Companion.PageSession.ActiveAugmentingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
	this._contentHighlighter = null;
	
	this._facetProperties = [];
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
    this._dom.analyzeButton = this._page.childNodes[0].childNodes[1];
    this._dom.analyzeButton.addEventListener('command', function(event) { self._pageSession.analyze(); }, true);
    
    this._dom.typeFacetContainer = this._page.getElementsByTagName("vbox")[0];
    
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
    this._hideLightboxOverlay();
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

Companion.PageSession.ActiveAugmentingStage.prototype._onItemsChanged = function() {
    this._hideLightboxOverlay();
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
    
    var newProperties = {};
    if (hasRestrictions) {
    	var items = collection.getRestrictedItems();
    	var types = database.getObjectsUnion(items, "type");
    	types.visit(function(typeID) {
    		var properties = freebaseModel.getPropertiesOfType(typeID);
    		if (properties) {
    			for (var i = 0; i < properties.length; i++) {
    				var propertyID = properties[i];
    				if (properties[i].indexOf("/common/") != 0) {
    					newProperties[properties[i]] = true;
    				}
    			}
    		}
    	});
	}
    
	for (var i = this._facetProperties.length - 1; i >= 0; i--) {
		var facetProperty = this._facetProperties[i];
		if (facetProperty in newProperties) {
			delete newProperties[facetProperty];
		} else {
			if (!this._facets[i].hasRestrictions()) {
				this._facets[i].dispose();
				this._facets.splice(i, 1);
				this._facetProperties.splice(i, 1);
				
                this._dom.facetList.removeItemAt(i);
                this._dom.facetDeck.removeChild(this._dom.facetDeck.childNodes[i]);
			}
		}
	}
	
	var self = this;
	for (var propertyID in newProperties) {
		if (database.countDistinctObjectsUnion(items, propertyID) > 1) {
            var propertyRecord = database.getProperty(propertyID);
            var label = (propertyRecord != null) ? propertyRecord.getLabel() : propertyID;
            var expectedTypeLabel = (propertyRecord != null && "_expectedTypeLabel" in propertyRecord) ? 
                propertyRecord._expectedTypeLabel : "related things";
            
			var config = {
				facetLabel:         label,
                expectedTypeLabel:  expectedTypeLabel,
				expression:         "." + propertyID,
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
			var facet = this._appendFacet(database, collection, propertyID + "-facet", config);
			this._facets.push(facet);
			this._facetProperties.push(propertyID);
		}
	}
    
    if (this._dom.facetList.selectedIndex == -1 && this._facets.length > 0) {
        this._dom.facetList.selectedIndex = 0;
    }
    this._dom.facetOuterDeck.selectedIndex = (this._facets.length > 0) ? 1 : 0;
};

Companion.PageSession.ActiveAugmentingStage.prototype._getDocument = function() {
	return this._pageSession.windowSession.browser.contentDocument;
};

Companion.PageSession.ActiveAugmentingStage.prototype._highlightContent = function() {
	if (this._contentHighlighter == null) {
		var self = this;
		this._contentHighlighter = new Companion.SinglePageContentHighlighter(
			this._pageSession.identityModel,
			function(itemIDs) {
				self._showFreebaseTopics(itemIDs);
			}
		);
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

Companion.PageSession.ActiveAugmentingStage._overlayID = "metawebCompanion-lightboxOverlay";
Companion.PageSession.ActiveAugmentingStage.prototype._showFreebaseTopics = function(itemIDs) {
    var doc = this._getDocument();
    var overlayDiv = doc.getElementById(Companion.PageSession.ActiveAugmentingStage._overlayID);
    if (!(overlayDiv)) {
        var self = this;
        
        overlayDiv = doc.createElement("div");
        overlayDiv.id = Companion.PageSession.ActiveAugmentingStage._overlayID;
        overlayDiv.style.position = "fixed";
        overlayDiv.style.top = "0px";
        overlayDiv.style.left = "0px";
        overlayDiv.style.width = "100%";
        overlayDiv.style.height = "100%";
        overlayDiv.style.zIndex = "10000";
        doc.body.appendChild(overlayDiv);
        
        overlayDiv.innerHTML = 
            '<div style="position: relative; width: 100%; height: 100%;">' +
                '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; -moz-opacity: 0.5; background-color: black"></div>' +
                '<div style="position: absolute; top: 70px; left: 70px; right: 70px; bottom: 70px;">' +
                    '<iframe style="width: 100%; height: 100%;"></iframe>' +
                '</div>' +
            '</div>';
        overlayDiv.firstChild.firstChild.addEventListener('click', function(evt) { self._hideLightboxOverlay(); }, true);
    }
    
    overlayDiv.getElementsByTagName("iframe")[0].src = "http://freebase.com/view" + itemIDs[0];
};

Companion.PageSession.ActiveAugmentingStage.prototype._hideLightboxOverlay = function() {
    var doc = this._getDocument();
    var overlayDiv = doc.getElementById(Companion.PageSession.ActiveAugmentingStage._overlayID);
    if (overlayDiv) {
        overlayDiv.parentNode.removeChild(overlayDiv);
    }
};

Companion.PageSession.ActiveAugmentingStage.prototype._slideFreebase = function(fbids) {
	var url = "dataweb:browse?fbids=" + encodeURIComponent(fbids.join(";"));
	this._pageSession.windowSession.browser.setAttribute("src", url);
};
