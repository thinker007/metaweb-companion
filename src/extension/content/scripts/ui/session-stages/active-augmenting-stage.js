Companion.PageSession.ActiveAugmentingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
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
};

Companion.PageSession.ActiveAugmentingStage.prototype._listResults = function() {
    if (this._dom == null) {
        return;
    }
    
    var database = this._pageSession.database;
	var collection = this._pageSession.collection;
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
