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
			//Companion.log(this._doc.getElementById("the-browser").wrappedJSObject.contentWindow);
			//var node = new XPCNativeWrapper(this._doc.getElementById("the-browser").wrappedJSObject, "nodeType", "parentNode", "childNodes", "firstChild");
			//Companion.inspect(this._doc.wrappedJSObject);
			this._doc.wrappedJSObject.defaultView.wrappedJSObject["foo"]("abc"); 
		} catch (e) { Companion.log(e); }
	}
};
