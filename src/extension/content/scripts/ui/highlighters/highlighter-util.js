Companion.HighlighterUtil = {
	augmentingStyles: {
		styleID: 		"metawebCompanion-style",
		flagID:			"metawebCompanion-style-flag", // we need this because the browser seems to keep the style element around
		detectionClass: "metawebCompanion-detection",
		highlightClass: "metawebCompanion-highlight"
	}
};

Companion.HighlighterUtil.addAugmentingStyles = function(doc) {
    var style = doc.getElementById(Companion.HighlighterUtil.augmentingStyles.styleID);
    if (!style) {
        var head = doc.getElementsByTagName("head").item(0);
        if (head) {
            style = doc.createElement("style");
        } else {
            head = doc.getElementsByTagNameNS("http://www.w3.org/1999/xhtml", "head").item(0);
            style = doc.createElementNS("http://www.w3.org/1999/xhtml", "style");
        }
        
        style.id = Companion.HighlighterUtil.augmentingStyles.styleID;
        style.innerHTML = 
          "." + Companion.HighlighterUtil.augmentingStyles.detectionClass + " {}\n" +
          "." + Companion.HighlighterUtil.augmentingStyles.highlightClass + " { background-color: #ffff80; color: black; cursor: pointer; }";
        
        head.appendChild(style);
    }
	
    var flag = doc.getElementById(Companion.HighlighterUtil.augmentingStyles.flagID);
    if (!flag) {
		flag = doc.createElement("div");
		flag.id = Companion.HighlighterUtil.augmentingStyles.flagID;
		doc.body.appendChild(flag);
	}
};

Companion.HighlighterUtil.removeAugmentingStyles = function(doc) {
    var style = doc.getElementById(Companion.HighlighterUtil.augmentingStyles.styleID);
    if (style) {
		style.parentNode.removeChild(style);
    }
    var flag = doc.getElementById(Companion.HighlighterUtil.augmentingStyles.flagID);
    if (flag) {
		flag.parentNode.removeChild(style);
    }
};

Companion.HighlighterUtil.hasAugmentingStyles = function(doc) {
    return doc.getElementById(Companion.HighlighterUtil.augmentingStyles.flagID) != null;
};

Companion.HighlighterUtil.addAugmentations = function(doc, identityModel, onclick) {
	var ignore = { 
		"i":true, "you":true, "he":true, "she":true, "it":true, "we":true, "they":true, 
		"me":true, "him":true, "her":true, "us":true, "them":true,
		"his":true, "hers":true, "mine":true, "yours":true, "ours":true, "theirs":true
	};
	
	var index = identityModel.createManifestationIndex(ignore);
	
	var processElement = function(elmt) {
		var tagName = elmt.tagName;
		if (tagName == "script") {
			return;
		}
		
		var child = elmt.firstChild;
		while (child != null) {
			// processNode might change the child (such as removing it) so we need to save its next sibling first
			var nextChild = child.nextSibling;
			
			processNode(child);
			
			child = nextChild;
		}
	};
	
	var manifestations = index.manifestations;
	var processTextNode = function(textNode) {
		var text = textNode.nodeValue;
		
		var i = 0;
		for (; i < manifestations.length; i++) {
			var manifestation = manifestations[i];
			if (manifestation.length <= text.length) {
				break;
			}
		}
		for (; i < manifestations.length; i++) {
			var manifestation = manifestations[i];
			var l = text.indexOf(manifestation);
			if (l >= 0) {
				var before = text.substr(0, l);
				var after = text.substr(l + manifestation.length);
				var parentNode = textNode.parentNode;
				
				var span = doc.createElement("span");
				span.className = Companion.HighlighterUtil.augmentingStyles.detectionClass;
				span.appendChild(doc.createTextNode(manifestation));
				parentNode.insertBefore(span, textNode);
				
				var ids = [];
				for (var id in index.manifestationToIDs[manifestation]) {
					ids.push(id);
				}
				span.setAttribute("itemIDs", ids.join(";"));
                span.addEventListener('click', function(evt) {
					return Companion.HighlighterUtil._onClickAugmentation(evt, this, onclick); 
				}, true);
				
				if (before.length > 0) {
					var beforeTextNode = doc.createTextNode(before);
					parentNode.insertBefore(beforeTextNode, span);
					processTextNode(beforeTextNode);
				}
				if (after.length > 0) {
					textNode.nodeValue = after;
					processTextNode(textNode);
				} else {
					parentNode.removeChild(textNode);
				}
				return;
			}
		}
	};
	
	var processNode = function(node) {
		if (node != null) {
			switch (node.nodeType) {
			case 1:
				processElement(node);
				break;
			case 3:
				processTextNode(node);
				break;
			}
		}
	};
	
	processNode(doc.body);
};

Companion.HighlighterUtil.removeAugmentations = function(doc) {
	// TODO
};

Companion.HighlighterUtil.highlightAugmentations = function(doc, identities, animationCallback) {
	var spans = doc.getElementsByTagName("span");
	var spansToHighlight = [];
	
	for (var i = 0; i < spans.length; i++) {
		var span = spans[i];
		var classes = span.className;
		if (classes.indexOf(Companion.HighlighterUtil.augmentingStyles.detectionClass) >= 0) {
			var found = false;
			var itemIDs = span.getAttribute("itemIDs");			
			itemIDs = itemIDs.split(";");
			
			for (var j = 0; j < itemIDs.length; j++) {
				if (identities.contains(itemIDs[j])) {
					found = true;
					break;
				}
			}
			
			if (found) {
				span.className = Companion.HighlighterUtil.augmentingStyles.detectionClass + " " + Companion.HighlighterUtil.augmentingStyles.highlightClass;
				spansToHighlight.push(span);
			} else {
				span.className = Companion.HighlighterUtil.augmentingStyles.detectionClass;
			}
		}
	}
	
	animationCallback(spansToHighlight);
};

Companion.HighlighterUtil._onClickAugmentation = function(evt, elmt, onclick) {
    if (elmt.className.indexOf(Companion.HighlighterUtil.augmentingStyles.highlightClass) >= 0) {
        var itemIDs = elmt.getAttribute("itemIDs");
        try {
			onclick(itemIDs.split(";"));
		} catch (e) {
			Companion.log(e);
		}
            
        return Companion.cancelEvent(evt);
    }
}
