Companion.SinglePageContentHighlighter = function(identityModel, focusURLGenerator) {
	this._identityModel = identityModel;
	this._focusURLGenerator = focusURLGenerator;
	this._doc = null;
};

Companion.SinglePageContentHighlighter.prototype.dispose = function() {
	if (this._doc != null) {
		this._hideLightboxOverlay();
		Companion.HighlighterUtil.removeAugmentations(this._doc);
		Companion.HighlighterUtil.removeAugmentingStyles(this._doc);
		this._doc = null;
	}
	this._identityModel = null;
};

Companion.SinglePageContentHighlighter.prototype.setDocument = function(doc) {
	this._doc = doc;
};

Companion.SinglePageContentHighlighter.prototype.highlight = function(identities) {
	if (this._doc != null) {
		this._hideLightboxOverlay();
		this._highlightAugmentations(identities);
	}
};

Companion.SinglePageContentHighlighter.prototype._highlightAugmentations = function(identities) {
    var self = this;
	
	if (this._doc != null && !Companion.HighlighterUtil.hasAugmentingStyles(this._doc)) {
		Companion.HighlighterUtil.addAugmentingStyles(this._doc);
		Companion.HighlighterUtil.addAugmentations(
			this._doc, this._identityModel, function(itemIDs) { self._focus(itemIDs); });
	}

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

Companion.SinglePageContentHighlighter._overlayID = "metawebCompanion-lightboxOverlay";
Companion.SinglePageContentHighlighter.prototype._focus = function(itemIDs) {
    var overlayDiv = this._doc.getElementById(Companion.SinglePageContentHighlighter._overlayID);
    if (!(overlayDiv)) {
        var self = this;
        
        overlayDiv = this._doc.createElement("div");
        overlayDiv.id = Companion.SinglePageContentHighlighter._overlayID;
        overlayDiv.style.position = "fixed";
        overlayDiv.style.top = "0px";
        overlayDiv.style.left = "0px";
        overlayDiv.style.width = "100%";
        overlayDiv.style.height = "100%";
        overlayDiv.style.zIndex = "10000";
        this._doc.body.appendChild(overlayDiv);
        
        overlayDiv.innerHTML = 
            '<div style="position: relative; width: 100%; height: 100%;">' +
                '<div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; -moz-opacity: 0.5; background-color: black"></div>' +
                '<div style="position: absolute; top: 70px; left: 70px; right: 70px; bottom: 70px;">' +
                    '<iframe style="width: 100%; height: 100%;"></iframe>' +
                '</div>' +
            '</div>';
        overlayDiv.firstChild.firstChild.addEventListener('click', function(evt) { self._hideLightboxOverlay(); }, true);
    }
    
    overlayDiv.getElementsByTagName("iframe")[0].src = this._focusURLGenerator(itemIDs);
};

Companion.SinglePageContentHighlighter.prototype._hideLightboxOverlay = function() {
    var overlayDiv = this._doc.getElementById(Companion.SinglePageContentHighlighter._overlayID);
    if (overlayDiv) {
        overlayDiv.parentNode.removeChild(overlayDiv);
    }
};
