Companion.EntityIdentificationProcess2 = function(doc, identityModel, ui, settings) {
    this._doc = doc;
    this._identityModel = identityModel;
    
    this._ui = ui;
    this._settings = settings;
    this._normalizedNameToManifestations = {};
    
    this._running = false;
    this._cancel = false;
};

Companion.EntityIdentificationProcess2.prototype.start = function(onDone, onError) {
    this._onDone = onDone || function() {};
    this._onError = onError || function() {}
    this._running = true;
    
    this._getOpenCalaisAnnotation();
};

Companion.EntityIdentificationProcess2.prototype.cancel = function() {
    this._cancel = true;
};

Companion.EntityIdentificationProcess2.prototype._getOpenCalaisAnnotation = function() {
    this._ui.debugLog("Analyzing text using Zemanta...");
    
    var self = this;
    
    var textFragments = [];
    
    var processNode = function(node) {
        switch (node.nodeType) {
        case 3: // text node
            textFragments.push(node.nodeValue);
            break;
        case 1: // element
            var nodeName = node.nodeName.toLowerCase();
            switch (nodeName) {
            case "script":
            case "input":
            case "button":
            case "option":
            case "select":
                return; // ignore
            }
            var childNode = node.firstChild;
            while (childNode != null) {
                processNode(childNode);
                childNode = childNode.nextSibling;
            }
            break; 
        }
    };
    processNode(this._doc.body);
    
    var text = textFragments.join(" | ");
    ZemantaService.analyzeText(
        text, 
        function(json) {
            self._onZemantaTextAnalysisResult(json);
        },
        function(request) {
            self._notifyError(request.statusText);
        }
    );
};

Companion.EntityIdentificationProcess2.prototype._onZemantaTextAnalysisResult = function(json) {
    var links = json.markup.links;
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if ("freebase_guid" in link && link.freebase_guid.length > 0) {
            var manifestation = [ { text: link.anchor } ];
            this._identityModel.addEntityWithFreebaseID(
                "/guid/" + link.freebase_guid, 
                link.anchor, 
                manifestation
            );
        }
    }
    this._onDone();
};

Companion.EntityIdentificationProcess2.prototype._notifyError = function(s) {
    this._onError(s);
};
