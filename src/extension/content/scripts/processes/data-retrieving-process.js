Companion.DataRetrievingProcess = function(
	identityModel, 
	database, 
	ui, 
	settings
) {
	this._identityModel = identityModel;
	this._database = database;
	this._ui = ui;
	this._settings = settings;
	
	this._running = false;
	this._cancel = false;
};

Companion.DataRetrievingProcess.prototype.start = function(onDone, onError) {
	this._onDone = onDone || function() {};
	this._onError = onError || function() {}
	this._running = true;
	
	var ids = this._identityModel.getAllFreebaseIDs();
    this._ui.debugLog("Retrieving relationships from Freebase for " + ids.length + " name(s)...");
	
    var self = this;
    FreebaseService.getAllRelationships(
        ids, 
        function(results) { self._onDoneGetAllRelationships(ids, results); },
		function(s) { self._ui.debugLog(s); },
        function (s) { self._notifyError(s); }
    );
};

Companion.DataRetrievingProcess.prototype.cancel = function() {
	this._cancel = true;
};

Companion.DataRetrievingProcess.prototype._onDoneGetAllRelationships = function(ids, results) {
    this._database.loadFreebaseItems(results);
    this._ui.debugLog("Retrieving schemas from Freebase...");
	
	var self = this;
	var freebaseModel = this._settings.freebaseModel;
	FreebaseService.getSchema(
		this._database,
		freebaseModel,
		function() { self._onDone(); },
		function (s) { self._notifyError(s); }
	);
};

Companion.DataRetrievingProcess.prototype._notifyError = function(s) {
	this._onError(s);
};
