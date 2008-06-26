Companion.PageSession = function(windowSession, box) {
    this.windowSession = windowSession;
    this.database = Companion.Database.create();
	this.collection = null;
	this.detectionEntries = null;
    
    this._containerBox = box;
    
    this._pageHasFocus = false;
    this._stageCode = Companion.PageSession.STAGE_START;
    this._stage = null;
};

Companion.PageSession.STAGE_START = 0;
Companion.PageSession.STAGE_ACTIVATING = 1;
Companion.PageSession.STAGE_ACTIVE_AUGMENTING = 2;

Companion.PageSession.prototype.dispose = function() {
    this.database.removeAllStatements();
	this.database = null;
	
	if (this.collection != null) {
		this.collection.dispose();
		this.collection = null;
	}
	
	this.detectionEntries = null;
	
	this.windowSession = null;
	this._containerBox = null;
};
    
Companion.PageSession.prototype.installUserInterface = function() {
    this._pageHasFocus = true;
    this._internalInstallUserInterface();
};

Companion.PageSession.prototype.uninstallUserInterface = function() {
    this._pageHasFocus = false;
    this._internalUninstallUserInterface();
};

Companion.PageSession.prototype._internalInstallUserInterface = function() {
    if (this._stage == null) {
        switch (this._stageCode) {
        case Companion.PageSession.STAGE_START:
            this._stage = new Companion.PageSession.StartStage(this, this._containerBox);
            break;
    
        case Companion.PageSession.STAGE_ACTIVATING:
            this._stage = new Companion.PageSession.ActivatingStage(this, this._containerBox);
            break;
            
        case Companion.PageSession.STAGE_ACTIVE_AUGMENTING:
            this._stage = new Companion.PageSession.ActiveAugmentingStage(this, this._containerBox);
            break;
        }
    }
    this._stage.installUserInterface();
};

Companion.PageSession.prototype._internalUninstallUserInterface = function() {
    if (this._stage != null) {
        this._stage.uninstallUserInterface();
    }
};

Companion.PageSession.prototype._switchStage = function(newStageCode) {
    if (this._stage != null) {
        if (this._pageHasFocus) {
            this._stage.uninstallUserInterface();
        }
        this._stage.dispose();
        this._stage = null;
    }
    
    this._stageCode = newStageCode;
    this._internalInstallUserInterface();
};

Companion.PageSession.prototype.analyze = function() {
    this.database.removeAllStatements();
    
    this._switchStage(Companion.PageSession.STAGE_ACTIVATING);
    this._stage.kickstart();
};

Companion.PageSession.prototype.augment = function(typeProperties, ids) {
    this.collection = Companion.Collection.createGivenCollection("default", this.database, ids);
	this.typeProperties = typeProperties;
    this._switchStage(Companion.PageSession.STAGE_ACTIVE_AUGMENTING); 
};
