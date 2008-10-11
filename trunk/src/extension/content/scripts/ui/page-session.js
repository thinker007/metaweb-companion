Companion.PageSession = function(windowSession) {
    this.windowSession = windowSession;
    
    this._pageHasFocus = false;
    this._stageCode = Companion.PageSession.STAGE_START;
    this._stage = null;
};

Companion.PageSession.STAGE_START = 0;
Companion.PageSession.STAGE_ACTIVATING = 1;
Companion.PageSession.STAGE_ACTIVE_AUGMENTING = 2;

Companion.PageSession.prototype.dispose = function() {
    this._stage = null;
    
    this.detectionEntries = null;
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
            this._stage = new Companion.PageSession.StartStage(this);
            break;
    
        case Companion.PageSession.STAGE_ACTIVATING:
            this._stage = new Companion.PageSession.ActivatingStage(this);
            break;
            
        case Companion.PageSession.STAGE_ACTIVE_AUGMENTING:
            this._stage = new Companion.PageSession.ActiveAugmentingStage(this);
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
        try {
            if (this._pageHasFocus) {
                this._stage.uninstallUserInterface();
            }
            this._stage.dispose();
        } catch (e) {
            Companion.exception(e);
        }
        this._stage = null;
    }
    
    this._stageCode = newStageCode;
    this._internalInstallUserInterface();
};

Companion.PageSession.prototype.reset = function() {
    this._switchStage(Companion.PageSession.STAGE_START);
};

Companion.PageSession.prototype.activate = function() {
    if (this._stageCode == Companion.PageSession.STAGE_ACTIVE_AUGMENTING) {
        this.reset();
    }
    if (this._stageCode == Companion.PageSession.STAGE_START) {
        this._switchStage(Companion.PageSession.STAGE_ACTIVATING);
        this._stage.kickstart();
    }
};

Companion.PageSession.prototype.augment = function(identityModel) {
    this.identityModel = identityModel;
    this._switchStage(Companion.PageSession.STAGE_ACTIVE_AUGMENTING); 
};
