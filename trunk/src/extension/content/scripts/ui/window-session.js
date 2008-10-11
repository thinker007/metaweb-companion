Companion.WindowSession = function(browser) {
    this.browser = browser;
    
    this._initialized = false;
    this._hasFocus = false;
    
    this._keyToPageSession = {};
    this._currentPageSession = null;
};

Companion.WindowSession.prototype.activate = function() {
    this.getCurrentPageSession(true).activate();
};

Companion.WindowSession.prototype.getCurrentPageSessionKey = function() {
    return this.browser.contentWindow.location.href;
};

Companion.WindowSession.prototype.getCurrentPageSession = function(create) {
    var key = this.getCurrentPageSessionKey();
    if (key in this._keyToPageSession) {
        return this._keyToPageSession[key];
    } else if (create) {
        var pageSession = new Companion.PageSession(this);
        this._keyToPageSession[key] = pageSession;
        return pageSession;
    } else {
        return null;
    }
};

Companion.WindowSession.prototype.onGotFocus = function() {
    if (!this._initialized) {
        this._initialize();
        this._initialized = true;
    }
    
    this._hasFocus = true;
    this._updateUserInterface(true);
}

Companion.WindowSession.prototype.onLostFocus = function() {
    if (this._currentPageSession != null) {
        this._currentPageSession.uninstallUserInterface();
    }
    this._hasFocus = false;
}

Companion.WindowSession.prototype._initialize = function() {
    var self = this;
    
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
        onStateChange : function(progress, request, flags, status) {
            // Only watch windows that are their own parent - e.g. not frames
            if (progress.DOMWindow.parent == progress.DOMWindow && 
                (flags & Components.interfaces.nsIWebProgressListener.STATE_STOP)) {
                if (self._hasFocus) {
                    self._updateUserInterface(false);
                }
            }
        },
        onProgressChange : function() {},
        onStatusChange : function() {},
        onSecurityChange : function() {},
        onLinkIconAvailable : function() {}, 
        onLocationChange: function(progress, request, location) {}
    };
    this.browser.addProgressListener(this._progressListener, 
        Components.interfaces.nsIWebProgress.NOTIFY_STATE_DOCUMENT);
};

Companion.WindowSession.prototype._updateUserInterface = function(forceInstallUserInterface) {
    var pageSession = this.getCurrentPageSession(true);
    if (pageSession != this._currentPageSession) {
        if (this._currentPageSession != null) {
            this._currentPageSession.uninstallUserInterface();
        }
        this._currentPageSession = pageSession;
        this._currentPageSession.installUserInterface(); 
    } else if (forceInstallUserInterface) {
        this._currentPageSession.installUserInterface(); 
    }
};
