/*==================================================
 *  Companion.ListFacet
 *==================================================
 */

Companion.ListFacet = function(name, database, collection, box, settings) {
    this.name = name;
    this._database = database;
    this._collection = collection;
    this._box = box;
    this._settings = settings;
    
    this._expression = Companion.ExpressionParser.parse(settings.expression);
    this._selectMissing = ("selectMissing" in settings) && settings.selectMissing;
    this._valueSet = new Companion.Set();
    
    if ("selection" in settings) {
        var selection = configuration.selection;
        for (var i = 0; i < selection.length; i++) {
            facet._valueSet.add(selection[i]);
        }
    }
    
    if ("fixedOrder" in settings) {
        var orderMap = {};
        for (var i = 0; i < settings.fixedOrder.length; i++) {
            orderMap[settings.fixedOrder[i].trim()] = i;
        }
        this._orderMap = orderMap;
    }
    
    this._cache = new Companion.FacetCache(database, collection, this._expression);
    
    this._initializeUI();
    this._collection.addFacet(this);
};

Companion.ListFacet._settingSpecs = {
    "facetLabel":       { type: "text" },
    "fixedOrder":       { type: "text" },
    "filterable":       { type: "boolean", defaultValue: true },
    "selectMultiple":   { type: "boolean", defaultValue: true },
    "sortable":         { type: "boolean", defaultValue: true },
    "sortMode":         { type: "text", defaultValue: "value" },
    "sortDirection":    { type: "text", defaultValue: "forward" },
    "showMissing":      { type: "boolean", defaultValue: true },
    "missingLabel":     { type: "text" }
};

Companion.ListFacet.prototype.dispose = function() {
    this._cache.dispose();
    this._cache = null;
    
    this._collection.removeFacet(this);
    this._collection = null;
    
    this._box = null;
    
    this._expression = null;
    this._valueSet = null;
    this._settings = null;
};

Companion.ListFacet.prototype.hasRestrictions = function() {
    return this._valueSet.size() > 0 || this._selectMissing;
};

Companion.ListFacet.prototype.clearAllRestrictions = function() {
    var restrictions = { selection: [], selectMissing: false };
    if (this.hasRestrictions()) {
        this._valueSet.visit(function(v) {
            restrictions.selection.push(v);
        });
        this._valueSet = new Companion.Set();
        
        restrictions.selectMissing = this._selectMissing;
        this._selectMissing = false;
        
        this._notifyCollection();
    }
    return restrictions;
};

Companion.ListFacet.prototype.applyRestrictions = function(restrictions) {
    this._valueSet = new Companion.Set();
    for (var i = 0; i < restrictions.selection.length; i++) {
        this._valueSet.add(restrictions.selection[i]);
    }
    this._selectMissing = restrictions.selectMissing;
    
    this._notifyCollection();
};

Companion.ListFacet.prototype.setSelection = function(value, selected) {
    if (selected) {
        this._valueSet.add(value);
    } else {
        this._valueSet.remove(value);
    }
    this._notifyCollection();
}

Companion.ListFacet.prototype.setSelectMissing = function(selected) {
    if (selected != this._selectMissing) {
        this._selectMissing = selected;
        this._notifyCollection();
    }
}

Companion.ListFacet.prototype.restrict = function(items) {
    if (this._valueSet.size() == 0 && !this._selectMissing) {
        return items;
    }
    
    var set = this._cache.getItemsFromValues(this._valueSet, items);
    if (this._selectMissing) {
        this._cache.getItemsMissingValue(items, set);
    }
    
    return set;
};

Companion.ListFacet.prototype.update = function(items) {
    if (!this._changingSelection) {
        this._entries = this._computeFacet(items);
        this._constructBody();
    }
};

Companion.ListFacet.prototype._computeFacet = function(items) {
    var database = this._database;
    var r = this._cache.getValueCountsFromItems(items);
    var entries = r.entries;
    var valueType = r.valueType;
    
    if (entries.length > 0) {
        var selection = this._valueSet;
        var labeler = function(v) { var l = database.getObject(v, "label"); return l != null ? l : v; };
		/*valueType == "item" ?
            function(v) { var l = database.getObject(v, "label"); return l != null ? l : v; } :
            function(v) { return v; }*/
            
        for (var i = 0; i < entries.length; i++) {
            var entry = entries[i];
            entry.actionLabel = entry.selectionLabel = labeler(entry.value);
            entry.selected = selection.contains(entry.value);
        }
    }
    
    if (this._settings.showMissing || this._selectMissing) {
        var count = this._cache.countItemsMissingValue(items);
        if (count > 0 || this._selectMissing) {
            entries.unshift({
                value:          null, 
                count:          count,
                selected:       this._selectMissing,
                selectionLabel: this._settings.missingLabel,
                actionLabel:    this._settings.missingLabel
            });
        }
    }
    entries.sort(this._createSortFunction(valueType));
    
    return entries;
}

Companion.ListFacet.prototype._notifyCollection = function() {
    this._collection.onFacetUpdated(this);
};

Companion.ListFacet.prototype._initializeUI = function() {
    this._dom = Companion.FacetUtilities.constructFacetFrame(
        this._box,
        this._settings.facetLabel,
        this._settings.filterable
    );
    if (!this._settings.selectMultiple) {
        this._dom.valuesContainer.selType = "single";
    }
    this._registerEventListeners();
};

Companion.ListFacet.prototype.refresh = function() { 
    this._registerEventListeners();
    this._constructBody();
};

Companion.ListFacet.prototype._registerEventListeners = function() {   
    var self = this;
    this._dom.reset.onmousedown = function(event) {
        return Companion.cancelEvent(event);
    };
    this._dom.reset.onclick = function(event) {
        if (self._settings.filterable) {
            self._dom.filterHintedTextbox.setValue("");
        }
        self.clearAllRestrictions();
    };
    this._dom.valuesContainer.onselect = function() {
        if (!self._constructingBody) {
            self._onSelectionChange(self._dom.valuesContainer.treeBoxObject.view.wrappedJSObject);
        }
        return true;
    };
    if (this._settings.filterable) {
        this._dom.filterInput.onkeyup = function(event) {
            self._onFilterKeyUp(event);
        };
    }
    this._dom.headerLabel.onmousedown = function(e) {
        Companion.startDraggingFacet(e, self, self._box);
    };
	/*
    this._dom.closeButton.onclick = function(e) {
        Companion.removeFacet(self);
    };
	*/
};

Companion.ListFacet.prototype._constructBody = function() {   
    this._constructingBody = true;
    
    var entries = this._entries;
    var tree = this._dom.valuesContainer;
    var treeView = Companion.ListFacet._createTreeView(this, entries);
    if (this._settings.filterable) {
        treeView.setFilter(this._dom.filterHintedTextbox.getValue());
    }
    tree.treeBoxObject.view = treeView;
    
    var selection = treeView.selection;
    for (var i = 0; i < entries.length; i++) {
        if (entries[i].selected) {
            selection.select(i);
        }
    }
    
    var cols = tree.getElementsByTagName("treecol");
    var valueColumn = cols[0];
    var countColumn = cols[1];
    
    if (this._settings.sortable) {
        var sortValue = this._settings.sortMode == "value";
        if (sortValue) {
            valueColumn.setAttribute("sortDirection", (this._settings.sortDirection == "forward") ? "ascending" : "descending");
            countColumn.setAttribute("sortDirection", "");
        } else {
            countColumn.setAttribute("sortDirection", (this._settings.sortDirection == "forward") ? "descending" : "ascending");
            valueColumn.setAttribute("sortDirection", "");
        }
        tree.setAttribute("sortResource", sortValue ? "value-column" : "count-column");
        
        var self = this;
        if (sortValue) {
            countColumn.onclick = function() {
                self._settings.sortMode = "count";
                self._settings.sortDirection = "forward";
                entries.sort(function(a, b) {
                    return b.count - a.count;
                });
                self._constructBody();
            };
            valueColumn.onclick = function() {
                self._settings.sortDirection = (self._settings.sortDirection == "forward") ? "reverse" : "forward";
                entries.reverse();
                self._constructBody();
            };
        } else {
            countColumn.onclick = function() {
                self._settings.sortDirection = (self._settings.sortDirection == "forward") ? "reverse" : "forward";
                entries.reverse();
                self._constructBody();
            };
            valueColumn.onclick = function() {
                self._settings.sortMode = "value";
                self._settings.sortDirection = "forward";
                entries.sort(function(a, b) {
                    return a.selectionLabel.localeCompare(b.selectionLabel);
                });
                self._constructBody();
            };
        }
    }
    
    this._dom.setSelectionCount(this._valueSet.size() + (this._selectMissing ? 1 : 0));
    
    this._constructingBody = false;
};

Companion.ListFacet.prototype._onSelectionChange = function(view) {
    var restrictions = { selection: [], selectMissing: false };
    
    var entries = view.wrappedJSObject._filteredEntries;
    var selection = view.selection;
    var rowCount = view.rowCount;
    if (this._settings.selectMultiple) {
        for (var i = 0; i < rowCount; i++) {
            if (selection.isSelected(i)) {
                var value = entries[i].value;
                if (value == null) {
                    restrictions.selectMissing = true;
                } else {
                    restrictions.selection.push(value);
                }
                entries[i].selected = true;
            } else {
                entries[i].selected = false;
            }
        }
    } else {
        for (var i = 0; i < rowCount; i++) {
            if (selection.currentIndex == i) {
                var value = entries[i].value;
                if (value == null) {
                    restrictions.selectMissing = true;
                } else {
                    restrictions.selection.push(value);
                }
                entries[i].selected = true;
            } else {
                entries[i].selected = false;
            }
        }
    }
    
    this._changingSelection = true;
    this.applyRestrictions(restrictions);
    this._dom.setSelectionCount(selection.count);
    this._changingSelection = false;
};

Companion.ListFacet.prototype._onFilterKeyUp = function(event) {
    var tree = this._dom.valuesContainer;
    var view = tree.treeBoxObject.view;
    var text = this._dom.filterHintedTextbox.getValue().trim();
    
    if (event.keyCode == 13 && view.rowCount > 0 && text.length > 0) {
        var selection = view.selection;
        selection.clearSelection();
        selection.select(0);
        tree.focus();
    } else {
        view.wrappedJSObject.setFilter(text);
    }
};

Companion.ListFacet.prototype._createSortFunction = function(valueType) {
    var sortValueFunction = function(a, b) {
        return a.selectionLabel.localeCompare(b.selectionLabel)
    };
    if ("_orderMap" in this) {
        var orderMap = this._orderMap;
        
        sortValueFunction = function(a, b) {
            if (a.selectionLabel in orderMap) {
                if (b.selectionLabel in orderMap) {
                    return orderMap[a.selectionLabel] - orderMap[b.selectionLabel];
                } else {
                    return -1;
                }
            } else if (b.selectionLabel in orderMap) {
                return 1;
            } else {
                return a.selectionLabel.localeCompare(b.selectionLabel);
            }
        }
    } else if (valueType == "number") {
        sortValueFunction = function(a, b) {
            a = parseFloat(a.value);
            b = parseFloat(b.value);
            return a < b ? -1 : a > b ? 1 : 0;
        }
    }
    
    var sortFunction = sortValueFunction;
    if (this._settings.sortMode == "count") {
        sortFunction = function(a, b) {
            var c = b.count - a.count;
            return c != 0 ? c : sortValueFunction(a, b);
        }
    }

    var sortDirectionFunction = sortFunction;
    if (this._settings.sortDirection == "reverse"){
        sortDirectionFunction = function(a, b) {
            return sortFunction(b, a);
        }
    }
    
    return sortDirectionFunction;
}

Companion.ListFacet._createTreeView = function(facet, entries) {
    var treeView = new Companion.StaticListTreeView();
    treeView._entries = entries;
    treeView._filteredEntries = entries;
    treeView.rowCount = entries.length;
    treeView.getCellText = function(row, column) {
        var entry = this._filteredEntries[row];
        switch (column.id) {
        case "count-column":
            return entry.count;
        case "value-column":
            return entry.selectionLabel;
        }
        return null;
    };
    treeView.getValue = function(row) {
        return this._filteredEntries[row].value;
    };
    treeView.setFilter = function(text) {
        text = text.trim().toLowerCase();
        
        var oldRowCount = this._filteredEntries.length;
        if (text.length == 0) {
            this._filteredEntries = this._entries;
        } else {
            this._filteredEntries = [];
            for (var i = 0; i < this._entries.length; i++) {
                var entry = this._entries[i];
                if (entry.selectionLabel.toLowerCase().indexOf(text) >= 0) {
                    this._filteredEntries.push(entry);
                }
            }
        }
        this.rowCount = this._filteredEntries.length;
        
        if ("treebox" in this) {
            this.treebox.beginUpdateBatch();
            this.treebox.rowCountChanged(0, -oldRowCount);
            this.treebox.rowCountChanged(0, this.rowCount);
            this.treebox.endUpdateBatch();
        }
    };
    
    return treeView;
};
