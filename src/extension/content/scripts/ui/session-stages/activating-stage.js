Companion.PageSession.ActivatingStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
	this._process = null;
};

Companion.PageSession.ActivatingStage.prototype.installUserInterface = function() {
    var self = this;
    
    this._page = document.getElementById("companion-pageSession-activatingStagePage").cloneNode(true);
    
    this._dom = {};
    this._dom.logListbox = this._page.getElementsByTagName("listbox")[0];
    
    this._page.hidden = false;
    this._containerBox.appendChild(this._page);
};

Companion.PageSession.ActivatingStage.prototype.uninstallUserInterface = function() {
    if (this._page != null) {
        this._containerBox.removeChild(this._page);
        this._page = null;
        this._dom = null;
    }
};

Companion.PageSession.ActivatingStage.prototype.dispose = function() {
	this._cancelProcess();
	
	this._page = null;
	this._dom = null;
	this._containerBox = null;
	this._pageSession = null;
};

Companion.PageSession.ActivatingStage.prototype.kickstart = function() {
	this._cancelProcess();
    this._doEntityIdentification();
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
	var self = this;
	return {
		debugLog: function(s) {
			if (self._dom != null) { self._dom.logListbox.appendItem(s, s); }
		}
	};
};

Companion.PageSession.ActivatingStage.prototype._createErrorHandler = function() {
	var self = this;
	return function() {
		self._process = null;
		alert("Uh oh"); // TODO: something more reasonable :)
	};
};

Companion.PageSession.ActivatingStage.prototype._doEntityIdentification = function() {
	var self = this;
	
	var identityModel = new Companion.IdentityModel();
	var onDone = function() {
		self._process = null;
		self._doDataRetrieval(identityModel);
	};
	
	this._process = new Companion.EntityIdentificationProcess(this._getDocument(), identityModel, this._createProcessUI(), {});
	this._process.start(onDone, this._createErrorHandler());
};

Companion.PageSession.ActivatingStage.prototype._doDataRetrieval = function(identityModel) {
	var self = this;
	var freebaseModel = new Companion.FreebaseModel();
	var onDone = function() {
		self._process = null;
		self._pageSession.augment(identityModel, freebaseModel);
	};
	
	this._process = new Companion.DataRetrievingProcess(
		identityModel, 
		this._pageSession.database, 
		this._createProcessUI(), 
		{
			freebaseModel: 	freebaseModel,
			rdfModel: 		null // TODO
		}
	);
	this._process.start(onDone, this._createErrorHandler());
};
