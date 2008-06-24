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
    
    this._dom.typeListbox = this._page.getElementsByTagName("listbox")[0];
    this._dom.propertyListbox = this._page.getElementsByTagName("listbox")[1];
    
    this._page.hidden = false;
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
};

Companion.PageSession.ActiveAugmentingStage.prototype._listResults = function() {
    if (this._dom == null) {
        return;
    }
    
    var database = this._pageSession.database;
    
    var propertyListbox = this._dom.propertyListbox;
    var properties = database.getAllProperties();
    for (var i = 0; i < properties.length; i++) {
        var pID = properties[i];
        propertyListbox.appendItem(pID, pID);
    }
    
    var typeListbox = this._dom.typeListbox;
    var items = new Companion.Set(this._pageSession.ids);
    var types = database.getObjectsUnion(items, "type");
    types.visit(function(t) {
        var count = database.countDistinctSubjects(t, "type", items);
        var text = t + " (" + count + ")";
        typeListbox.appendItem(text, text);
    });
};
