/*======================================================================
 *  Companion.Database
 *======================================================================
 */

Companion.Database = new Object();

Companion.Database.create = function() {
    return new Companion.Database._Impl();
};

/*==================================================
 *  Companion.Database._Impl
 *==================================================
 */
Companion.Database._Impl = function() {
    this._types = {};
	this._typeArray = null;
    this._properties = {};
    this._propertyArray = {};
    
    this._listeners = new Companion.ListenerQueue();
    
    this._spo = {};
    this._ops = {};
    this._items = new Companion.Set();
    
    /*
     *  Predefined types and properties
     */
     
    var l10n = Companion.Database.l10n;
    
    var itemType = new Companion.Database._Type("Item");
    itemType._custom = Companion.Database.l10n.itemType;
    this._types["Item"] = itemType;

    var labelProperty = new Companion.Database._Property("label");
    labelProperty._uri                  = "http://www.w3.org/2000/01/rdf-schema#label";
    labelProperty._valueType            = "text";
    labelProperty._label                = l10n.labelProperty.label;
    labelProperty._pluralLabel          = l10n.labelProperty.pluralLabel;
    labelProperty._reverseLabel         = l10n.labelProperty.reverseLabel;
    labelProperty._reversePluralLabel   = l10n.labelProperty.reversePluralLabel;
    labelProperty._groupingLabel        = l10n.labelProperty.groupingLabel;
    labelProperty._reverseGroupingLabel = l10n.labelProperty.reverseGroupingLabel;
    this._properties["label"]           = labelProperty;
    
    var typeProperty = new Companion.Database._Property("type");
    typeProperty._uri                   = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
    typeProperty._valueType             = "text";
    typeProperty._label                 = "type";
    typeProperty._pluralLabel           = l10n.typeProperty.label;
    typeProperty._reverseLabel          = l10n.typeProperty.reverseLabel;
    typeProperty._reversePluralLabel    = l10n.typeProperty.reversePluralLabel;
    typeProperty._groupingLabel         = l10n.typeProperty.groupingLabel;
    typeProperty._reverseGroupingLabel  = l10n.typeProperty.reverseGroupingLabel;
    this._properties["type"]            = typeProperty;
    
    var uriProperty = new Companion.Database._Property("uri");
    uriProperty._uri                    = "http://simile.mit.edu/2006/11/exhibit#uri";
    uriProperty._valueType              = "url";
    uriProperty._label                  = "URI";
    uriProperty._pluralLabel            = "URIs";
    uriProperty._reverseLabel           = "URI of";
    uriProperty._reversePluralLabel     = "URIs of";
    uriProperty._groupingLabel          = "URIs";
    uriProperty._reverseGroupingLabel   = "things named by these URIs";
    this._properties["uri"]             = uriProperty;
};

Companion.Database._Impl.prototype.createDatabase = function() {
    return Companion.Database.create();
};

Companion.Database._Impl.prototype.addListener = function(listener) {
    this._listeners.add(listener);
};

Companion.Database._Impl.prototype.removeListener = function(listener) {
    this._listeners.remove(listener);
};

Companion.Database._Impl.prototype.loadDataLinks = function(fDone) {
    var links = [];
    var heads = document.documentElement.getElementsByTagName("head");
    for (var h = 0; h < heads.length; h++) {
        var linkElmts = heads[h].getElementsByTagName("link");
        for (var l = 0; l < linkElmts.length; l++) {
            var link = linkElmts[l];
            if (link.rel.match(/\bexhibit\/data\b/)) {
                links.push(link);
            }
        }
    }
    
    this._loadLinks(links, fDone);
};

Companion.Database._Impl.prototype.loadFreebaseItems = function(relationEntries) {
    this._listeners.fire("onBeforeLoadingItems", []);
    try {
		var baseURI = "";
		
        var spo = this._spo;
        var ops = this._ops;
        var indexPut = Companion.Database._indexPut;
        var indexPut2 = Companion.Database._indexPut2; // subject will always be unique; so this is an optimization
        var indexTriple = function(s, p, o) {
            indexPut(spo, s, p, o);
            indexPut2(ops, o, p, s);
        };
        
		var missingLabels = {};
		var missingTypes = {};
		var getID = function(a) {
			if ("length" in a) {
				return a[0].id;
			} else {
				return a.id;
			}
		};
        for (var i = 0; i < relationEntries.length; i++) {
            var entry = relationEntries[i];
			var pID = entry.master_property;
			if (pID == "/type/object/permission") {
				continue;
			}
			
			var reverse = entry.reverse;
			var sID = getID(reverse ? entry.target : entry.source);
			var tID = getID(reverse ? entry.source : entry.target);
			
			var theTarget = ("length" in entry.target) ? entry.target[0] : entry.target;
			if ("name" in theTarget && theTarget.name.length > 0) {
				indexTriple(theTarget.id, "label", theTarget.name[0].value);
			}
			
			if (!this._items.contains(sID)) {
				missingLabels[sID] = true;
				missingTypes[sID] = true;
				this._items.add(sID);
			}
			/*if (!this._items.contains(tID)) {
				missingLabels[tID] = true;
				missingTypes[tID] = true;
				this._items.add(tID);
			}*/
			        
			if (pID == "/type/object/type") {
				indexTriple(sID, "type", tID);
				this._ensureTypeExists(tID, baseURI);
			} else if (pID == "/type/object/name") {
				indexTriple(sID, "label", tID);
				delete missingLabels[sID];
			} else {
				this._ensurePropertyExists(pID, baseURI)._onNewData();
				indexTriple(sID, pID, tID);
			}
        }
		
		for (var sID in missingLabels) {
			indexTriple(sID, "label", sID);
		}
        
		this._typeArray = null;
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingItems", []);
    } catch(e) {
        Companion.exception(e);
    }
};

Companion.Database._Impl.prototype.loadData = function(o, baseURI) {
    if (typeof baseURI == "undefined") {
        baseURI = location.href;
    }
    if ("types" in o) {
        this.loadTypes(o.types, baseURI);
    }
    if ("properties" in o) {
        this.loadProperties(o.properties, baseURI);
    }
    if ("items" in o) {
        this.loadItems(o.items, baseURI);
    }
};

Companion.Database._Impl.prototype.loadTypes = function(typeEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingTypes", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1)
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
    
        for (var typeID in typeEntries) {
            if (typeof typeID != "string") {
                continue;
            }
            
            var typeEntry = typeEntries[typeID];
            if (typeof typeEntry != "object") {
                continue;
            }
            
            var type;
            if (typeID in this._types) {
                type = this._types[typeID];
            } else {
                type = new Companion.Database._Type(typeID);
                this._types[typeID] = type;
            };
            
            for (var p in typeEntry) {
                type._custom[p] = typeEntry[p];
            }
            
            if (!("uri" in type._custom)) {
                type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
            }
            if (!("label" in type._custom)) {
                type._custom["label"] = typeID;
            }
        }
        
        this._listeners.fire("onAfterLoadingTypes", []);
    } catch(e) {
        Companion.exception(e);
    }
};

Companion.Database._Impl.prototype.loadProperties = function(propertyEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingProperties", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1)
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
    
        for (var propertyID in propertyEntries) {
            if (typeof propertyID != "string") {
                continue;
            }
            
            var propertyEntry = propertyEntries[propertyID];
            if (typeof propertyEntry != "object") {
                continue;
            }
            
            var property;
            if (propertyID in this._properties) {
                property = this._properties[propertyID];
            } else {
                property = new Companion.Database._Property(propertyID, this);
                this._properties[propertyID] = property;
            };
            
            property._uri = ("uri" in propertyEntry) ? propertyEntry.uri : (baseURI + "property#" + encodeURIComponent(propertyID));
            property._valueType = ("valueType" in propertyEntry) ? propertyEntry.valueType : "text";
                // text, html, number, date, boolean, item, url
            
            property._label = ("label" in propertyEntry) ? propertyEntry.label : propertyID;
            property._pluralLabel = ("pluralLabel" in propertyEntry) ? propertyEntry.pluralLabel : property._label;
            
            property._reverseLabel = ("reverseLabel" in propertyEntry) ? propertyEntry.reverseLabel : ("!" + property._label);
            property._reversePluralLabel = ("reversePluralLabel" in propertyEntry) ? propertyEntry.reversePluralLabel : ("!" + property._pluralLabel);
            
            property._groupingLabel = ("groupingLabel" in propertyEntry) ? propertyEntry.groupingLabel : property._label;
            property._reverseGroupingLabel = ("reverseGroupingLabel" in propertyEntry) ? propertyEntry.reverseGroupingLabel : property._reverseLabel;
            
            if ("origin" in propertyEntry) {
                property._origin = propertyEntry.origin;
            }
        }
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingProperties", []);
    } catch(e) {
        Companion.exception(e);
    }
};

Companion.Database._Impl.prototype.loadItems = function(itemEntries, baseURI) {
    this._listeners.fire("onBeforeLoadingItems", []);
    try {
        var lastChar = baseURI.substr(baseURI.length - 1);
        if (lastChar == "#") {
            baseURI = baseURI.substr(0, baseURI.length - 1) + "/";
        } else if (lastChar != "/" && lastChar != ":") {
            baseURI += "/";
        }
        
        var spo = this._spo;
        var ops = this._ops;
        var indexPut = Companion.Database._indexPut;
        var indexPut2 = Companion.Database._indexPut2; // subject will always be unique; so this is an optimization
        var indexTriple = function(s, p, o) {
            indexPut(spo, s, p, o);
            indexPut2(ops, o, p, s);
        };
        
        for (var i = 0; i < itemEntries.length; i++) {
            var entry = itemEntries[i];
            if (typeof entry == "object") {
                this._loadItem(entry, indexTriple, baseURI);
            }
        }
        
        this._propertyArray = null;
        
        this._listeners.fire("onAfterLoadingItems", []);
    } catch(e) {
        Companion.exception(e);
    }
};

Companion.Database._Impl.prototype.getType = function(typeID) {
    return this._types[typeID];
};

Companion.Database._Impl.prototype.getProperty = function(propertyID) {
    return propertyID in this._properties ? this._properties[propertyID] : null;
};

Companion.Database._Impl.prototype.getPropertyForced = function(propertyID) {
	this._ensurePropertyExists(propertyID, "");
	return this._properties[propertyID];
};

/**
 * Get an array of all property names known to this database.
 */
Companion.Database._Impl.prototype.getAllProperties = function() {
    if (this._propertyArray == null) {
        this._propertyArray = [];
        for (var propertyID in this._properties) {
            this._propertyArray.push(propertyID);
        }
    }
    
    return [].concat(this._propertyArray);
};

Companion.Database._Impl.prototype.getAllTypes = function() {
    if (this._typeArray == null) {
        this._typeArray = [];
        for (var typeID in this._types) {
			if (typeID != "Item") {
				this._typeArray.push(typeID);
			}
        }
    }
    
    return [].concat(this._typeArray);
};

Companion.Database._Impl.prototype.getAllItems = function() {
    var items = new Companion.Set();
    items.addSet(this._items);
    
    return items;
};

Companion.Database._Impl.prototype.getAllItemsCount = function() {
    return this._items.size();
};

Companion.Database._Impl.prototype.containsItem = function(itemID) {
    return this._items.contains(itemID);
};

Companion.Database._Impl.prototype.getNamespaces = function(idToQualifiedName, prefixToBase) {
    var bases = {};
    for (var propertyID in this._properties) {
        var property = this._properties[propertyID];
        var uri = property.getURI();
        
        var hash = uri.indexOf("#");
        if (hash > 0) {
            var base = uri.substr(0, hash + 1);
            bases[base] = true;
            
            idToQualifiedName[propertyID] = {
                base:       base,
                localName:  uri.substr(hash + 1)
            };
            continue;
        }
        
        var slash = uri.lastIndexOf("/");
        if (slash > 0) {
            var base = uri.substr(0, slash + 1);
            bases[base] = true;
            
            idToQualifiedName[propertyID] = {
                base:       base,
                localName:  uri.substr(slash + 1)
            };
            continue;
        }
    }
    
    var baseToPrefix = {};
    var letters = "abcdefghijklmnopqrstuvwxyz";
    var i = 0;
    
    for (var base in bases) {
        var prefix = letters.substr(i++,1);
        prefixToBase[prefix] = base;
        baseToPrefix[base] = prefix;
    }
    
    for (var propertyID in idToQualifiedName) {
        var qname = idToQualifiedName[propertyID];
        qname.prefix = baseToPrefix[qname.base];
    }
};

Companion.Database._Impl.prototype._loadItem = function(itemEntry, indexFunction, baseURI) {
    if (!("label" in itemEntry) && !("id" in itemEntry)) {
        /*
        Companion.warn("Item entry has no label and no id: " +
                              SimileAjax.JSON.toJSONString( itemEntry ));
        */
        return;
    }
    
    var id;
    if (!("label" in itemEntry)) {
        id = itemEntry.id;
        if (!this._items.contains(id)) {
            /*
            Companion.warn("Cannot add new item containing no label: " +
                                  SimileAjax.JSON.toJSONString( itemEntry ));
            */
        }
    } else {
        var label = itemEntry.label;
        var id = ("id" in itemEntry) ? itemEntry.id : label;
        var uri = ("uri" in itemEntry) ? itemEntry.uri : (baseURI + "item#" + encodeURIComponent(id));
        var type = ("type" in itemEntry) ? itemEntry.type : "/common/topic";
        
        var isArray = function(obj) {
           if (obj.constructor.toString().indexOf("Array") == -1)
              return false;
           else
              return true;
        }
        if(isArray(label))
            label = label[0];
        if(isArray(id))
            id = id[0];
        if(isArray(uri))
            uri = uri[0];
        
        this._items.add(id);
        
        indexFunction(id, "uri", uri);
        indexFunction(id, "label", label);
		
        if (isArray(type)) {
			if (type.length == 0) {
				type = [ "/common/topic" ];
			}
			for (var i = 0; i < type.length; i++) {
				var t = type[i];
				indexFunction(id, "type", t);
				this._ensureTypeExists(t, baseURI);
			}
        } else {
			indexFunction(id, "type", type);
			this._ensureTypeExists(type, baseURI);
		}
    }
    
    for (var p in itemEntry) {
        if (typeof p != "string") {
            continue;
        }
        
        if (p != "uri" && p != "label" && p != "id" && p != "type") {
            this._ensurePropertyExists(p, baseURI)._onNewData();
            
            var v = itemEntry[p];
            if (v != undefined && v != null) {
                if (typeof v == "array" || (typeof v == "object" && "concat" in v)) {
                    for (var j = 0; j < v.length; j++) {
                        indexFunction(id, p, v[j]);
                    }
                } else {
                    indexFunction(id, p, v);
                }
            }
        }
    }
};

Companion.Database._Impl.prototype._ensureTypeExists = function(typeID, baseURI) {
    if (!(typeID in this._types)) {
        var type = new Companion.Database._Type(typeID);
        
        type._custom["uri"] = baseURI + "type#" + encodeURIComponent(typeID);
        type._custom["label"] = typeID;
        
        this._types[typeID] = type;
    }
};

Companion.Database._Impl.prototype._ensurePropertyExists = function(propertyID, baseURI) {
    if (!(propertyID in this._properties)) {
        var property = new Companion.Database._Property(propertyID);
        
        property._uri = baseURI + "property#" + encodeURIComponent(propertyID);
        property._valueType = "text";
        
        property._label = propertyID;
        property._pluralLabel = property._label;
        
        property._reverseLabel = "reverse of " + property._label;
        property._reversePluralLabel = "reverse of " + property._pluralLabel;
        
        property._groupingLabel = property._label;
        property._reverseGroupingLabel = property._reverseLabel;
        
        this._properties[propertyID] = property;
        
        return property;
    } else {
        return this._properties[propertyID];
    }
};

Companion.Database._indexPut = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        array = new Array();
        hash[y] = array;
    } else {
        for (var i = 0; i < array.length; i++) {
            if (z == array[i]) {
                return;
            }
        }
    }
    array.push(z);
};

Companion.Database._indexPut2 = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        hash[y] = [z];
    } else {
        array.push(z);
    }
};

Companion.Database._indexPutList = function(index, x, y, list) {
    var hash = index[x];
    if (!hash) {
        hash = {};
        index[x] = hash;
    }
    
    var array = hash[y];
    if (!array) {
        hash[y] = list;
    } else {
        hash[y] = hash[y].concat(list);
    }
};

Companion.Database._indexRemove = function(index, x, y, z) {
    var hash = index[x];
    if (!hash) {
        return false;
    }
    
    var array = hash[y];
    if (!array) {
        return false;
    }
    
    for (var i = 0; i < array.length; i++) {
        if (z == array[i]) {
            array.splice(i, 1);
            if (array.length == 0) {
                delete hash[y];
            }
            return true;
        }
    }
};

Companion.Database._indexRemoveList = function(index, x, y) {
    var hash = index[x];
    if (!hash) {
        return null;
    }
    
    var array = hash[y];
    if (!array) {
        return null;
    }
    
    delete hash[y];
    return array;
};

Companion.Database._Impl.prototype._indexFillSet = function(index, x, y, set, filter) {
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0; i < array.length; i++) {
                    var z = array[i];
                    if (filter.contains(z)) {
                        set.add(z);
                    }
                }
            } else {
                for (var i = 0; i < array.length; i++) {
                    set.add(array[i]);
                }
            }
        }
    }
};

Companion.Database._Impl.prototype._indexCountDistinct = function(index, x, y, filter) {
    var count = 0;
    var hash = index[x];
    if (hash) {
        var array = hash[y];
        if (array) {
            if (filter) {
                for (var i = 0; i < array.length; i++) {
                    if (filter.contains(array[i])) {
                        count++;
                    }
                }
            } else {
                count = array.length;
            }
        }
    }
    return count;
};

Companion.Database._Impl.prototype._get = function(index, x, y, set, filter) {
    if (!set) {
        set = new Companion.Set();
    }
    this._indexFillSet(index, x, y, set, filter);
    return set;
};

Companion.Database._Impl.prototype._getUnion = function(index, xSet, y, set, filter) {
    if (!set) {
        set = new Companion.Set();
    }
    
    var database = this;
    xSet.visit(function(x) {
        database._indexFillSet(index, x, y, set, filter);
    });
    return set;
};

Companion.Database._Impl.prototype._countDistinctUnion = function(index, xSet, y, filter) {
    var count = 0;
    var database = this;
    xSet.visit(function(x) {
        count += database._indexCountDistinct(index, x, y, filter);
    });
    return count;
};

Companion.Database._Impl.prototype._countDistinct = function(index, x, y, filter) {
    return this._indexCountDistinct(index, x, y, filter);
};

Companion.Database._Impl.prototype._getProperties = function(index, x) {
    var hash = index[x];
    var properties = []
    if (hash) {
        for (var p in hash) {
            properties.push(p);
        }
    }
    return properties;
};

Companion.Database._Impl.prototype.getObjects = function(s, p, set, filter) {
    return this._get(this._spo, s, p, set, filter);
};

Companion.Database._Impl.prototype.countDistinctObjects = function(s, p, filter) {
    return this._countDistinct(this._spo, s, p, filter);
};

Companion.Database._Impl.prototype.getObjectsUnion = function(subjects, p, set, filter) {
    return this._getUnion(this._spo, subjects, p, set, filter);
};

Companion.Database._Impl.prototype.countDistinctObjectsUnion = function(subjects, p, filter) {
    return this._countDistinctUnion(this._spo, subjects, p, filter);
};

Companion.Database._Impl.prototype.getSubjects = function(o, p, set, filter) {
    return this._get(this._ops, o, p, set, filter);
};

Companion.Database._Impl.prototype.countDistinctSubjects = function(o, p, filter) {
    return this._countDistinct(this._ops, o, p, filter);
};

Companion.Database._Impl.prototype.getSubjectsUnion = function(objects, p, set, filter) {
    return this._getUnion(this._ops, objects, p, set, filter);
};

Companion.Database._Impl.prototype.countDistinctSubjectsUnion = function(objects, p, filter) {
    return this._countDistinctUnion(this._ops, objects, p, filter);
};

Companion.Database._Impl.prototype.getObject = function(s, p) {
    var hash = this._spo[s];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};

Companion.Database._Impl.prototype.getSubject = function(o, p) {
    var hash = this._ops[o];
    if (hash) {
        var array = hash[p];
        if (array) {
            return array[0];
        }
    }
    return null;
};

Companion.Database._Impl.prototype.getForwardProperties = function(s) {
    return this._getProperties(this._spo, s);
};

Companion.Database._Impl.prototype.getBackwardProperties = function(o) {
    return this._getProperties(this._ops, o);
};

Companion.Database._Impl.prototype.getSubjectsInRange = function(p, min, max, inclusive, set, filter) {
    var property = this.getProperty(p);
    if (property != null) {
        var rangeIndex = property.getRangeIndex();
        if (rangeIndex != null) {
            return rangeIndex.getSubjectsInRange(min, max, inclusive, set, filter);
        }
    }
    return (!set) ? new Companion.Set() : set;
};

Companion.Database._Impl.prototype.getTypeIDs = function(set) {
    return this.getObjectsUnion(set, "type", null, null);
};

Companion.Database._Impl.prototype.addStatement = function(s, p, o) {
    var indexPut = Companion.Database._indexPut;
    indexPut(this._spo, s, p, o);
    indexPut(this._ops, o, p, s);
};

Companion.Database._Impl.prototype.removeStatement = function(s, p, o) {
    var indexRemove = Companion.Database._indexRemove;
    var removedObject = indexRemove(this._spo, s, p, o);
    var removedSubject = indexRemove(this._ops, o, p, s);
    return removedObject || removedSubject;
};

Companion.Database._Impl.prototype.removeObjects = function(s, p) {
    var indexRemove = Companion.Database._indexRemove;
    var indexRemoveList = Companion.Database._indexRemoveList;
    var objects = indexRemoveList(this._spo, s, p);
    if (objects == null) {
        return false;
    } else {
        for (var i = 0; i < objects.length; i++) {
            indexRemove(this._ops, objects[i], p, s);
        }
        return true;
    }
};

Companion.Database._Impl.prototype.removeItem = function(itemID) {
    var properties = this._spo[itemID];
    if (properties) {
        for (var p in properties) {
            this.removeObjects(itemID, p);
        }
    }
};

Companion.Database._Impl.prototype.removeSubjects = function(o, p) {
    var indexRemove = Companion.Database._indexRemove;
    var indexRemoveList = Companion.Database._indexRemoveList;
    var subjects = indexRemoveList(this._ops, o, p);
    if (subjects == null) {
        return false;
    } else {
        for (var i = 0; i < subjects.length; i++) {
            indexRemove(this._spo, subjects[i], p, o);
        }
        return true;
    }
};

Companion.Database._Impl.prototype.removeAllStatements = function() {
    this._listeners.fire("onBeforeRemovingAllStatements", []);
    try {
        this._spo = {};
        this._ops = {};
        this._items = new Companion.Set();
    
        for (var propertyID in this._properties) {
            this._properties[propertyID]._onNewData();
        }
        this._propertyArray = null;
        
        this._listeners.fire("onAfterRemovingAllStatements", []);
    } catch(e) {
        Companion.exception(e);
    }
};

/*==================================================
 *  Companion.Database._Type
 *==================================================
 */
Companion.Database._Type = function(id) {
    this._id = id;
    this._custom = {};
};

Companion.Database._Type.prototype = {
    getID:          function()  { return this._id; },
    getURI:         function()  { return this._custom["uri"]; },
    getLabel:       function()  { return this._custom["label"]; },
    getOrigin:      function()  { return this._custom["origin"]; },
    getProperty:    function(p) { return this._custom[p]; }
};

/*==================================================
 *  Companion.Database._Property
 *==================================================
 */
Companion.Database._Property = function(id, database) {
    this._id = id;
    this._database = database;
    this._rangeIndex = null;
};

Companion.Database._Property.prototype = {
    getID:          function() { return this._id; },
    getURI:         function() { return this._uri; },
    getValueType:   function() { return this._valueType; },
    
    getLabel:               function() { return this._label; },
    getPluralLabel:         function() { return this._pluralLabel; },
    getReverseLabel:        function() { return this._reverseLabel; },
    getReversePluralLabel:  function() { return this._reversePluralLabel; },
    getGroupingLabel:       function() { return this._groupingLabel; },
    getGroupingPluralLabel: function() { return this._groupingPluralLabel; },
    getOrigin:              function() { return this._origin; }
};

Companion.Database._Property.prototype._onNewData = function() {
    this._rangeIndex = null;
};

Companion.Database._Property.prototype.getRangeIndex = function() {
    if (this._rangeIndex == null) {
        this._buildRangeIndex();
    }
    return this._rangeIndex;
};

Companion.Database._Property.prototype._buildRangeIndex = function() {
    var getter;
    var database = this._database;
    var p = this._id;
    
    switch (this.getValueType()) {
    case "number":
        getter = function(item, f) {
            database.getObjects(item, p, null, null).visit(function(value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
        break;
    case "date":
        getter = function(item, f) {
            database.getObjects(item, p, null, null).visit(function(value) {
                /*if (value != null && !(value instanceof Date)) {
                    value = SimileAjax.DateTime.parseIso8601DateTime(value);
                }*/
                if (value instanceof Date) {
                    f(value.getTime());
                }
            });
        };
        break;
    default:
        getter = function(item, f) {};
    }
    
    this._rangeIndex = new Companion.Database._RangeIndex(
        this._database.getAllItems(),
        getter
    );
};

/*==================================================
 *  Companion.Database._RangeIndex
 *==================================================
 */
Companion.Database._RangeIndex = function(items, getter) {
    pairs = [];
    items.visit(function(item) {
        getter(item, function(value) {
            pairs.push({ item: item, value: value });
        });
    });
    
    pairs.sort(function(p1, p2) {
        var c = p1.value - p2.value;
        return c != 0 ? c : p1.item.localeCompare(p2.item);
    });
    
    this._pairs = pairs;
};

Companion.Database._RangeIndex.prototype.getCount = function() {
    return this._pairs.count();
};

Companion.Database._RangeIndex.prototype.getMin = function() {
    return this._pairs.length > 0 ? 
        this._pairs[0].value : 
        Number.POSITIVE_INFINITY;
};

Companion.Database._RangeIndex.prototype.getMax = function() {
    return this._pairs.length > 0 ? 
        this._pairs[this._pairs.length - 1].value : 
        Number.NEGATIVE_INFINITY;
};

Companion.Database._RangeIndex.prototype.getRange = function(visitor, min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var pairs = this._pairs;
    var l = pairs.length;
    
    inclusive = (inclusive);
    while (startIndex < l) {
        var pair = pairs[startIndex++];
        var value = pair.value;
        if (value < max || (value == max && inclusive)) {
            visitor(pair.item);
        } else {
            break;
        }
    }
};

Companion.Database._RangeIndex.prototype.getSubjectsInRange = function(min, max, inclusive, set, filter) {
    if (!set) {
        set = new Companion.Set();
    }
    
    var f = (filter != null) ?
        function(item) {
            if (filter.contains(item)) {
                set.add(item);
            }
        } :
        function(item) {
            set.add(item);
        };
        
    this.getRange(f, min, max, inclusive);
    
    return set;
};

Companion.Database._RangeIndex.prototype.countRange = function(min, max, inclusive) {
    var startIndex = this._indexOf(min);
    var endIndex = this._indexOf(max);
    
    if (inclusive) {
        var pairs = this._pairs;
        var l = pairs.length;
        while (endIndex < l) {
            if (pairs[endIndex].value == max) {
                endIndex++;
            } else {
                break;
            }
        }
    }
    return endIndex - startIndex;
};

Companion.Database._RangeIndex.prototype._indexOf = function(v) {
    var pairs = this._pairs;
    if (pairs.length == 0 || pairs[0].value >= v) {
        return 0;
    }
    
    var from = 0;
    var to = pairs.length;
    while (from + 1 < to) {
        var middle = (from + to) >> 1;
        var v2 = pairs[middle].value;
        if (v2 >= v) {
            to = middle;
        } else {
            from = middle;
        }
    }
    
    return to;
};
