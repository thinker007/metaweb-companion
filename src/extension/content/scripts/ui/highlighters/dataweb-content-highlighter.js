Companion.DatawebContentHighlighter = function(focusURLGenerator) {
	this._focusURLGenerator = focusURLGenerator;
	this._doc = null;
};

Companion.DatawebContentHighlighter.prototype.dispose = function() {
	if (this._doc != null) {
		this._doc = null;
	}
	this._focusURLGenerator = null;
};

Companion.DatawebContentHighlighter.prototype.setDocument = function(doc) {
	this._doc = doc;
};

Companion.DatawebContentHighlighter.prototype.highlight = function(identities) {
	if (this._doc != null) {
		try {
			this._getDatawebPageHook("highlight")(identities);
		} catch (e) { Companion.log(e); }
	}
};

Companion.DatawebContentHighlighter.prototype._getDatawebPageHook = function(name) {
	return this._doc.wrappedJSObject.defaultView.wrappedJSObject[name];
};
