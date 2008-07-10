/*======================================================================
 *  Collection
 *======================================================================
 */
Companion.Collection = function(id, database) {
    this._id = id;
    this._database = database;
    
    this._listeners = new Companion.ListenerQueue();
    this._facets = [];
    this._updating = false;
    
    this._items = null;
    this._restrictedItems = null;
};

Companion.Collection.createGivenCollection = function(id, database, ids) {
    var collection = new Companion.Collection(id, database);
	collection._items = new Companion.Set(ids);
    collection._internalUpdate = function(){};
    
    Companion.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Companion.Collection.createAllItemsCollection = function(id, database) {
    var collection = new Companion.Collection(id, database);
    collection._internalUpdate = Companion.Collection._allItemsCollection_update;
    
    Companion.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Companion.Collection.createTypeBasedCollection = function(id, database, itemTypes) {
    var collection = new Companion.Collection(id, database);
    collection._itemTypes = itemTypes;
    collection._internalUpdate = Companion.Collection._typeBasedCollection_update;
    
    Companion.Collection._initializeBasicCollection(collection, database);
    
    return collection;
};

Companion.Collection._initializeBasicCollection = function(collection, database) {
    var update = function() { collection._update(); };
    collection._listener = { 
        onAfterLoadingItems: update,
        onAfterRemovingAllStatements: update
    };
    database.addListener(collection._listener);
        
    collection._update();
};

/*======================================================================
 *  Implementation
 *======================================================================
 */
Companion.Collection._allItemsCollection_update = function() {
    this._items = this._database.getAllItems();
};

Companion.Collection._typeBasedCollection_update = function() {
    var newItems = new Companion.Set();
    for (var i = 0; i < this._itemTypes.length; i++) {
        this._database.getSubjects(this._itemTypes[i], "type", newItems);
    }
    
    this._items = newItems;
};

/*======================================================================
 *  Common Implementation
 *======================================================================
 */
Companion.Collection.prototype.getID = function() {
    return this._id;
};

Companion.Collection.prototype.dispose = function() {
    if ("_baseCollection" in this) {
        this._baseCollection.removeListener(this._listener);
        this._baseCollection = null;
        this._expression = null;
    } else {
        this._database.removeListener(this._listener);
    }
    this._database = null;
    this._listener = null;
    
    this._listeners = null;
    this._items = null;
    this._restrictedItems = null;
};

Companion.Collection.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

Companion.Collection.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

Companion.Collection.prototype.getFacets = function() {
    return [].concat(this._facets);
};

Companion.Collection.prototype.addFacet = function(facet) {
    this._facets.push(facet);
    
    if (facet.hasRestrictions()) {
        this._computeRestrictedItems();
        this._updateFacets(null);
        this._listeners.fire("onItemsChanged", []);
    } else {
        facet.update(this.getRestrictedItems());
    }
};

Companion.Collection.prototype.removeFacet = function(facet) {
    for (var i = 0; i < this._facets.length; i++) {
        if (facet == this._facets[i]) {
            this._facets.splice(i, 1);
            if (facet.hasRestrictions()) {
                this._computeRestrictedItems();
                this._updateFacets(null);
                this._listeners.fire("onItemsChanged", []);
            }
            break;
        }
    }
};

Companion.Collection.prototype.clearAllRestrictions = function() {
    var restrictions = [];
    
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        restrictions.push(this._facets[i].clearAllRestrictions());
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
    
    return restrictions;
};

Companion.Collection.prototype.applyRestrictions = function(restrictions) {
    this._updating = true;
    for (var i = 0; i < this._facets.length; i++) {
        this._facets[i].applyRestrictions(restrictions[i]);
    }
    this._updating = false;
    
    this.onFacetUpdated(null);
};

Companion.Collection.prototype.getAllItems = function() {
    return new Companion.Set(this._items);
};

Companion.Collection.prototype.countAllItems = function() {
    return this._items.size();
};

Companion.Collection.prototype.getRestrictedItems = function() {
    return new Companion.Set(this._restrictedItems);
};

Companion.Collection.prototype.countRestrictedItems = function() {
    return this._restrictedItems.size();
};

Companion.Collection.prototype.onFacetUpdated = function(facetChanged) {
    if (!this._updating) {
        this._computeRestrictedItems();
        this._updateFacets(facetChanged);
        this._listeners.fire("onItemsChanged", []);
    }
}

Companion.Collection.prototype._update = function() {
    this._internalUpdate();
    this._onRootItemsChanged();
};

Companion.Collection.prototype._onRootItemsChanged = function() {
    this._listeners.fire("onRootItemsChanged", []);
    
    this._computeRestrictedItems();
    this._updateFacets(null);
    
    this._listeners.fire("onItemsChanged", []);
};

Companion.Collection.prototype._updateFacets = function(facetChanged) {
    var restrictedFacetCount = 0;
    for (var i = 0; i < this._facets.length; i++) {
        if (this._facets[i].hasRestrictions()) {
            restrictedFacetCount++;
        }
    }
    
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            if (restrictedFacetCount <= 1) {
                facet.update(this.getAllItems());
            } else {
                var items = this.getAllItems();
                for (var j = 0; j < this._facets.length; j++) {
                    if (i != j) {
                        items = this._facets[j].restrict(items);
                    }
                }
                facet.update(items);
            }
        } else {
            facet.update(this.getRestrictedItems());
        }
    }
};

Companion.Collection.prototype._computeRestrictedItems = function() {
    this._restrictedItems = this._items;
    for (var i = 0; i < this._facets.length; i++) {
        var facet = this._facets[i];
        if (facet.hasRestrictions()) {
            this._restrictedItems = facet.restrict(this._restrictedItems);
        }
    }
};
