Companion.PageSession.StartStage = function(pageSession, box) {
    this._pageSession = pageSession;
    this._containerBox = box;
    
    this._page = null;
    this._dom = null;
};

Companion.PageSession.StartStage.prototype.installUserInterface = function() {
    var self = this;
    
    this._page = document.getElementById("companion-pageSession-startStagePage").cloneNode(true);
    
    this._dom = {};
    this._dom.analyzeButton = this._page.childNodes[2].childNodes[0];
    this._dom.analyzeButton.addEventListener('command', function(event) { self._pageSession.analyze(); }, true);
    
    this._page.hidden = false;
    this._containerBox.appendChild(this._page);
};

Companion.PageSession.StartStage.prototype.uninstallUserInterface = function() {
    if (this._page != null) {
        this._containerBox.removeChild(this._page);
        this._page = null;
        this._dom = null;
    }
};

Companion.PageSession.StartStage.prototype.dispose = function() {
};
