Companion.PageSession.ActivatingStage = function(pageSession) {
    this._pageSession = pageSession;
    this._process = null;
};

Companion.PageSession.ActivatingStage.prototype.installUserInterface = function() {
    var self = this;
    
    document.getElementById("companion-statusBarPanel-progress").hidden = false;
    document.getElementById("companion-statusBarPanel-progress-cancelButton").onclick = function() {
        self._pageSession.reset();
    };
};

Companion.PageSession.ActivatingStage.prototype.uninstallUserInterface = function() {
    document.getElementById("companion-statusBarPanel-progress").hidden = true;
    document.getElementById("companion-statusBarPanel-progress-cancelButton").onclick = null;
};

Companion.PageSession.ActivatingStage.prototype.dispose = function() {
    this._cancelProcess();
    this._pageSession = null;
};

Companion.PageSession.ActivatingStage.prototype.kickstart = function() {
    this._cancelProcess();
    
    var doc = this._getDocument();
    if (Companion.isDatawebDocument(doc)) {
        this._handleDatawebPage(doc);
    } else if (Companion.isMultiwebDocument(doc)) {
        this._handleMultiwebPage(doc);
    } else {
        this._handleStandardWebPage(doc);
    }
};

Companion.PageSession.ActivatingStage.prototype._cancelProcess = function() {
    if (this._process != null) {
        this._process.cancel();
        this._process = null;
    }
};

Companion.PageSession.ActivatingStage.prototype._getDocument = function() {
    return this._pageSession.windowSession.browser.contentDocument;
};

Companion.PageSession.ActivatingStage.prototype._createProcessUI = function() {
    var label = document.getElementById("companion-statusBarPanel-progress-message");
    return {
        debugLog: function(s) {
            label.value = s;
        }
    };
};

Companion.PageSession.ActivatingStage.prototype._createErrorHandler = function() {
    var self = this;
    return function(s) {
        self._process = null;
        alert("Error: " + s); // TODO: something more reasonable :)
        self._pageSession.reset();
    };
};

Companion.PageSession.ActivatingStage.prototype._handleStandardWebPage = function(doc) {
    var self = this;
    var identityModel = new Companion.IdentityModel();
    this._identifyEntitiesInDocument(identityModel, doc, function() {
        self._onGotIdentityModel(identityModel);
    });
};

Companion.PageSession.ActivatingStage.prototype._handleDatawebPage = function(doc) {
    var identityModel = new Companion.IdentityModel();
    
    var params = doc.location.href.substr(doc.location.href.indexOf("?") + 1).split("&");
    for (var i = 0; i < params.length; i++) {
        var pair = params[i].split("=");
        var name = pair[0];
        var value = pair.length > 1 ? decodeURIComponent(pair[1]) : null;
        if (name == "fbids") {
            var freebaseIDs = value.split(";");
            
            for (var j = 0; j < freebaseIDs.length; j++) {
                var freebaseID = freebaseIDs[j];
                identityModel.addEntityWithFreebaseID(freebaseID, freebaseID, []);
            }
            break;
        }
    }
    
    this._onGotIdentityModel(identityModel);
};

Companion.PageSession.ActivatingStage.prototype._handleMultiwebPage = function(doc) {
    var self = this;
    var identityModel = new Companion.IdentityModel();
    
    var docs = doc.wrappedJSObject.defaultView.wrappedJSObject["getDocuments"]();
    var index = 0;
    var doNext = function() {
        if (index < docs.length) {
            try {
                var doc2 = docs[index++];
                
                if (self._dom != null) {
                    var s = "Processing " + doc2.location.href + " ...";
                    self._dom.logListbox.appendItem(s, s); 
                }
                
                self._identifyEntitiesInDocument(identityModel, doc2, doNext);
            } catch (e) {
                Companion.log(e);
            }
        } else {
            self._onGotIdentityModel(identityModel);
        };
    };
    doNext();
};

Companion.PageSession.ActivatingStage.prototype._identifyEntitiesInDocument = function(identityModel, doc, onDone) {
    var self = this;
    var onDone2 = function() {
        self._process = null;
        onDone();
    };
    
    this._process = new Companion.EntityIdentificationProcess(doc, identityModel, this._createProcessUI(), {});
    this._process.start(onDone2, this._createErrorHandler());
};

Companion.PageSession.ActivatingStage.prototype._onGotIdentityModel = function(identityModel) {
    this._pageSession.augment(identityModel);
};
