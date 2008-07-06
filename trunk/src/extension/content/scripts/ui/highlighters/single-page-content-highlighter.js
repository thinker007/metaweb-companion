Companion.SinglePageContentHighlighter = function(identityModel, focusCallback) {
	this._identityModel = identityModel;
	this._focusCallback = focusCallback;
	this._doc = null;
};

Companion.SinglePageContentHighlighter.prototype.dispose = function() {
	if (this._doc != null) {
		this._removeAugmentations(this._doc);
		this._removeAugmentingStyles(this._doc);
		this._doc = null;
	}
	this._identityModel = null;
};

Companion.SinglePageContentHighlighter.prototype.setDocument = function(doc) {
	this._doc = doc;
	this._prepareAugmentations();
};

Companion.SinglePageContentHighlighter.prototype.highlight = function(identities) {
	if (this._doc != null) {
		this._highlightAugmentations(identities);
	}
};

Companion.SinglePageContentHighlighter.prototype._prepareAugmentations = function() {
	if (this._doc != null && !Companion.HighlighterUtil.hasAugmentingStyles(this._doc)) {
		this._addAugmentingStyles();
		this._addAugmentations();
	}
};

Companion.SinglePageContentHighlighter.prototype._addAugmentingStyles = function() {
	Companion.HighlighterUtil.addAugmentingStyles(this._doc);
};

Companion.SinglePageContentHighlighter.prototype._removeAugmentingStyles = function() {
	Companion.HighlighterUtil.removeAugmentingStyles(this._doc);
};

Companion.SinglePageContentHighlighter.prototype._addAugmentations = function() {
	Companion.HighlighterUtil.addAugmentations(this._doc, this._identityModel, this._focusCallback);
};

Companion.SinglePageContentHighlighter.prototype._removeAugmentations = function() {
	Companion.HighlighterUtil.removeAugmentations(this._doc);
};

Companion.SinglePageContentHighlighter.prototype._highlightAugmentations = function(identities) {
    this._prepareAugmentations();

    var self = this;
	
	Companion.HighlighterUtil.highlightAugmentations(this._doc, identities, function(spansToHighlight) {
	    window.setTimeout(function() {
	    	self._showTargetCircles(self._doc, spansToHighlight);
	    }, 1000);
	});
};

Companion.SinglePageContentHighlighter.prototype._showTargetCircles = function(doc, elmts) {
	var containerID = "metawebCompanion-targetCircleContainer";
	var containerDiv = doc.getElementById(containerID);
	if (!(containerDiv)) {
		containerDiv = doc.createElement("div");
		containerDiv.id = containerID;
		containerDiv.style.position = "absolute";
		containerDiv.style.top = "0px";
		containerDiv.style.left = "0px";
		containerDiv.style.width = doc.body.scrollWidth + "px";
		containerDiv.style.height = doc.body.scrollHeight + "px";
		containerDiv.style.zIndex = 1000;
		doc.body.appendChild(containerDiv);
	}
	containerDiv.innerHTML = '<div style="position: relative; width: 100%; height: 100%; overflow: hidden"></div>';
	
	var win = doc.defaultView;
	var minTop = doc.body.scrollHeight;
	var maxTop = 0;
	
	var scrollTop = win.scrollY;
	var scrollLeft = win.scrollX;
	for (var i = 0; i < elmts.length; i++) {
		try {
			var elmt = elmts[i];
			var rect = elmt.getClientRects().item(0);
			var top = scrollTop + Math.ceil((rect.top + rect.bottom) / 2 - 50);
			var left = scrollLeft + Math.ceil((rect.left + rect.right) / 2 - 50);
			
			minTop = Math.min(minTop, top);
			maxTop = Math.max(maxTop, top);
			
			var img = doc.createElement("img");
			img.src = "http://metaweb-companion.googlecode.com/svn/trunk/src/extension/skin/images/target-circle.png";
			//img.src = "chrome://companion/skin/images/target-circle.png";
			img.style.position = "absolute";
			img.style.top = top + "px";
			img.style.left = left + "px";
			
			containerDiv.firstChild.appendChild(img);
		} catch (e) {}
	}
	
	if (minTop >= scrollTop + doc.body.clientHeight) { // need to scroll down
		doc.body.scrollTop = Math.min(win.scrollMaxY, minTop - 100);
	} else if (maxTop < scrollTop) { // need to scroll up
		doc.body.scrollTop = Math.max(0, maxTop - (doc.body.clientHeight - 100));
	}
	
	containerDiv.style.display = "block";
	
	window.setTimeout(function() {
		containerDiv.style.display = "none";
	}, 1200);
};
