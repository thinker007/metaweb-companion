Companion.PageSession.StartStage = function(pageSession) {
    this._pageSession = pageSession;
};

Companion.PageSession.StartStage.prototype.installUserInterface = function() {
    var self = this;
    
    document.getElementById("companion-statusBarPanel-freebaseButton").onclick = function() {
        self._pageSession.activate();
    };
};

Companion.PageSession.StartStage.prototype.uninstallUserInterface = function() {
    document.getElementById("companion-statusBarPanel-freebaseButton").onclick = null;
};

Companion.PageSession.StartStage.prototype.dispose = function() {
};
