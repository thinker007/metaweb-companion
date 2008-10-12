Companion.PageSession.ActiveAugmentingStage = function(pageSession) {
    this._pageSession = pageSession;
    
    this._page = null;
    this._dom = null;
    this._contentHighlighter = null;
    
    this._parallaxApp = new mw.parallax.ParallaxApp();
    this._parallaxApp.setNewQuery({ ids: this._pageSession.identityModel.getAllFreebaseIDs() });
    this._facetPanel = new mw.parallax.FacetPanel(new mw.ui.UIContext(this._parallaxApp.getUIContext()));
    this._pivotPanel = new mw.parallax.PivotPanel(new mw.ui.UIContext(this._parallaxApp.getUIContext()));
    
    this._getCollection().addListener(this);
};

Companion.PageSession.ActiveAugmentingStage.prototype.installUserInterface = function() {
    var self = this;

    document.getElementById("companion-statusBarPanel-freebaseButton").onclick = function() {
        self._pageSession.reset();
    };
    
    this._page = document.getElementById("companion-pageSession-activeAugmentingStagePage").cloneNode(true);
    Companion.addSidePaneContent(this._page);
    Companion.openSidePane();
    
    this._pivotPanel.installUI(this._page.childNodes[2]);
    this._facetPanel.installUI(this._page.childNodes[4]);
    
    window.setTimeout(function() { self._highlightContent(); }, 1500);
};

Companion.PageSession.ActiveAugmentingStage.prototype.uninstallUserInterface = function() {
    Companion.closeSidePane();
    
    document.getElementById("companion-statusBarPanel-freebaseButton").onclick = null;
    
    this._pivotPanel.uninstallUI();
    this._facetPanel.uninstallUI();
    this._page.parentNode.removeChild(this._page);
    
    this._page = null;
    this._dom = null;
};

Companion.PageSession.ActiveAugmentingStage.prototype.dispose = function() {
    if (this._contentHighlighter != null) {
        this._contentHighlighter.dispose();
        this._contentHighlighter = null;
    }
    
    this._getCollection().removeListener(this);
    this._parallaxApp.dispose();
    this._parallaxApp = null;
};

Companion.PageSession.ActiveAugmentingStage.prototype._getDocument = function() {
    return this._pageSession.windowSession.browser.contentDocument;
};

Companion.PageSession.ActiveAugmentingStage.prototype._getCollection = function() {
    return this._parallaxApp.getCurrentTrailPoint().collection;
};

Companion.PageSession.ActiveAugmentingStage.prototype.onItemsChanged = function() {
    this._highlightContent();
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
    
    var self = this;
    this._getRestrictedItemIDs(function(itemIDs) {
        self._contentHighlighter.highlight(itemIDs);
    });
};

Companion.PageSession.ActiveAugmentingStage.prototype._getRestrictedItemIDs = function(onDone) {
    var queryNode = this._getCollection().addRestrictions();
    queryNode["id"] = null;
    
    mw.freebase.mql.read(
        [queryNode], 
        function(o) {
            var itemIDs = [];
            for (var i = 0; i < o.result.length; i++) {
                itemIDs.push(o.result[i].id);
            }
            onDone(itemIDs);
        }, 
        mw.system.exception
    );
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
