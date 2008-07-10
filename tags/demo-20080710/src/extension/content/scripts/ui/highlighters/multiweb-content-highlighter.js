Companion.MultiwebContentHighlighter = function(identityModel, focusURLGenerator) {
	this._identityModel = identityModel;
	this._focusURLGenerator = focusURLGenerator;
	this._doc = null;
};

Companion.MultiwebContentHighlighter.prototype.dispose = function() {
	if (this._doc != null) {
		this._doc = null;
	}
	this._focusURLGenerator = null;
};

Companion.MultiwebContentHighlighter.prototype.setDocument = function(doc) {
	this._doc = doc;
};

Companion.MultiwebContentHighlighter.prototype.highlight = function(identities) {
	if (this._doc != null) {
		try {
			this._highlightAugmentations(identities);
		} catch (e) {
			Companion.log(e); 
		}
	}
};

Companion.MultiwebContentHighlighter.prototype._getDatawebPageHook = function(name) {
	return this._doc.wrappedJSObject.defaultView.wrappedJSObject[name];
};

Companion.MultiwebContentHighlighter.prototype._highlightAugmentations = function(identities) {
    var self = this;
	if (this._doc != null) {
		this._getMultiwebHook("clearPins")();
		
		var docs = this._getMultiwebHook("getDocuments")();
		var addPin = this._getMultiwebHook("addPin");
		var identityModel = this._identityModel;
		
		var processDoc = function(doc, index) {
			if (!Companion.HighlighterUtil.hasAugmentingStyles(doc)) {
				Companion.HighlighterUtil.addAugmentingStyles(doc);
				Companion.HighlighterUtil.addAugmentations(
					doc, identityModel, function(itemIDs) { self._focus(itemIDs); });
			}
			
			Companion.HighlighterUtil.highlightAugmentations(doc, identities, function(spansToHighlight) {
				for (var j = 0; j < spansToHighlight.length; j++){
					addPin(index, spansToHighlight[j]);
				}
			});
		};
		
		for (var i = 0; i < docs.length; i++) {
			processDoc(docs[i], i);
		}
	}
};

Companion.MultiwebContentHighlighter.prototype._focus = function(itemIDs) {
	this._getMultiwebHook("focus")(itemIDs);
};

Companion.MultiwebContentHighlighter.prototype._getMultiwebHook = function(name) {
	return this._doc.wrappedJSObject.defaultView.wrappedJSObject[name];
};
