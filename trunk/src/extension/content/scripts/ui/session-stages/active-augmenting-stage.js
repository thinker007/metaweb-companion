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
    
    var linkDivs = this._page.childNodes[0].childNodes;
    linkDivs[0].firstChild.onclick = function() {
        self._findNews();
    };
    linkDivs[1].firstChild.onclick = function() {
        self._browseTopicsAlone();
    };

    this._pivotPanel.installUI(this._page.childNodes[1]);
    this._facetPanel.installUI(this._page.childNodes[3]);
    
    window.setTimeout(function() { self._highlightContent(); }, 1500);
};

Companion.PageSession.ActiveAugmentingStage.prototype.uninstallUserInterface = function() {
    var linkDivs = this._page.childNodes[0].childNodes;
    linkDivs[0].firstChild.onclick = null;
    linkDivs[1].firstChild.onclick = null;
    
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

Companion.PageSession.ActiveAugmentingStage.prototype._findNews = function() {
    var onGotItems = function(itemIDs, names) {
        GoogleNewsService.getNews(names, 1, onGotNewsLinks, onStatus, onError);
    };
    
    var onGotNewsLinks = function(urls) {
        for (var i = 0; i < urls.length; i++) {
            urls[i] = "u=" + encodeURIComponent(urls[i]);
        }
        Companion.addTab(
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
    
    this._getRestrictedItemIDs(onGotItems);
};

Companion.PageSession.ActiveAugmentingStage.prototype._browseTopicsAlone = function() {
    this._getRestrictedItemIDs(function(itemIDs) {
        Companion.addTab(
            //"dataweb:browse" +
            "chrome://companion/content/browse.html" +
            "?ids=" + encodeURIComponent(itemIDs.join(";")));
    });
};

Companion.PageSession.ActiveAugmentingStage.prototype._getRestrictedItemIDs = function(onDone) {
    var queryNode = this._getCollection().addRestrictions();
    queryNode["id"] = null;
    queryNode["name"] = null;
    
    mw.freebase.mql.read(
        [queryNode], 
        function(o) {
            var itemIDs = [];
            var names = [];
            for (var i = 0; i < o.result.length; i++) {
                var item = o.result[i];
                itemIDs.push(item.id);
                names.push(item.name);
            }
            onDone(itemIDs, names);
        }, 
        mw.system.exception
    );
};
