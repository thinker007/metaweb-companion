Companion.PageSession = function(windowSession, key) {
    this._isQuery = false;
    this._query = null;
    this._uris = null;
    
    this._database = null;
    this._typeSelection = [];
    this._facets = [];
};
