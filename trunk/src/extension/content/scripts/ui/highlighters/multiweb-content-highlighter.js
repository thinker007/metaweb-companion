Companion.MultiwebContentHighlighter = function(focusURLGenerator) {
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
			//this._getDatawebPageHook("highlight")(identities);
		} catch (e) { Companion.log(e); }
	}
};

Companion.MultiwebContentHighlighter.prototype._getDatawebPageHook = function(name) {
	return this._doc.wrappedJSObject.defaultView.wrappedJSObject[name];
};
