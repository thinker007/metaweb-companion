Companion.WindowSession = function(browser) {
    this.browser = browser;
    
    this._tabHasFocus = false;
    this._dom = {};
    this._windowSessionPage = null;
    
    this._uiInitialized = false;
    this._keyToPageSession = {};
    this._currentPageSession = null;
};

Companion.WindowSession.prototype.getCurrentPageSessionKey = function() {
    return this.browser.contentWindow.location.href;
};

Companion.WindowSession.prototype.getCurrentPageSession = function(create) {
    var key = this.getCurrentPageSessionKey();
    if (key in this._keyToPageSession) {
        return this._keyToPageSession[key];
    } else if (create) {
        var pageSession = new Companion.PageSession(this, this._dom.pageSessionContainer);
        this._keyToPageSession[key] = pageSession;
        return pageSession;
    } else {
        return null;
    }
};

Companion.WindowSession.prototype.showUserInterface = function() {
    if (!this._uiInitialized) {
        this._initializeUserInterface();
        this._uiInitialized = true;
    }
    
    this._tabHasFocus = true;
    this._updateUserInterface();
    
    var crossWindowDeck = document.getElementById("companion-crossWindowDeck");
    crossWindowDeck.selectedPanel = this._windowSessionPage;
}

Companion.WindowSession.prototype.hideUserInterface = function() {
    this._tabHasFocus = false;
}

Companion.WindowSession.prototype._initializeUserInterface = function() {
    var self = this;
    
    /*
     *  Create our panel.
     */
    var windowSessionPageTemplate = document.getElementById("companion-windowSessionPage-template");
    this._windowSessionPage = windowSessionPageTemplate.cloneNode(true);
    this._windowSessionPage.hidden = false;
    
    this._dom.pageSessionContainer = this._windowSessionPage.getElementsByTagName("vbox")[0];
    
    var crossWindowDeck = document.getElementById("companion-crossWindowDeck");
    crossWindowDeck.appendChild(this._windowSessionPage);
    
    /*
     *  Listen for navigation events.
     */
    this._progressListener = {
        QueryInterface : function(iid) {
            if (iid.equals(Components.interfaces.nsIWebProgressListener) ||
                iid.equals(Components.interfaces.nsISupportsWeakReference) ||
                iid.equals(Components.interfaces.nsISupports)) {
                return this;
            }
            throw Components.results.NS_NOINTERFACE;
        },
    
        stateIsRequest: false,
        onStateChange : function() {},
        onProgressChange : function() {},
        onStatusChange : function() {},
        onSecurityChange : function() {},
        onLinkIconAvailable : function() {}, 
        onLocationChange: function(progress, request, location) {
            // Only watch windows that are their own parent - e.g. not frames
            if (progress.DOMWindow.parent == progress.DOMWindow) {
                if (self._tabHasFocus) {
                    self._updateUserInterface();
                }
            }
        }
    };
    this.browser.addProgressListener(this._progressListener, 
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
};

Companion.WindowSession.prototype._updateUserInterface = function() {
    var pageSession = this.getCurrentPageSession(true);
    if (pageSession != this._currentPageSession) {
        if (this._currentPageSession != null) {
            this._currentPageSession.uninstallUserInterface();
        }
        this._currentPageSession = pageSession;
        this._currentPageSession.installUserInterface(); 
    }
};
