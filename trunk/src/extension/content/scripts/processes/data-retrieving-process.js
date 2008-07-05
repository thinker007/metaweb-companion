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
	FreebaseService.getTypeProperties(
		this._database.getAllTypes(),
		function(o) { self._onDoneGetTypeProperties(o, ids); },
		function (s) { self._notifyError(s); }
	);
};

Companion.DataRetrievingProcess.prototype._onDoneGetTypeProperties = function(typePropertyEntries, ids) {
    var database = this._database;
	var freebaseModel = this._settings.freebaseModel;
    
    for (var i = 0; i < typePropertyEntries.length; i++) {
        var typePropertyEntry = typePropertyEntries[i];
        var propertyEntries = typePropertyEntry["/type/type/properties"];
        var propertyIDs = [];
        
        for (var j = 0; j < propertyEntries.length; j++) {
            var propertyEntry = propertyEntries[j];
            propertyIDs.push(propertyEntry.id);
            
            var propertyRecord = database.getProperty(propertyEntry.id);
            if (propertyRecord != null) {
                propertyRecord._label = propertyRecord._pluralLabel = propertyEntry.name;
                
                if ("expected_type" in propertyEntry) {
                    var expectedTypes = propertyEntry["expected_type"];
                    if (expectedTypes.length > 0) {
                        propertyRecord._expectedTypeLabel = expectedTypes[0].name;
                    }
                }
            }
			
			freebaseModel.addPropertyToType(typePropertyEntry.id, propertyEntry.id);
        }
    }
	
	this._onDone();
};

Companion.DataRetrievingProcess.prototype._notifyError = function(s) {
	this._onError(s);
};
