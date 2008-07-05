Companion.IdentityModel = function() {
	this._freebaseIDToRecord = {};
};

Companion.IdentityModel.prototype.addEntityWithFreebaseID = function(freebaseID, normalizedName, manifestations) {
	if (freebaseID in this._freebaseIDToRecord) {
		var record = this._freebaseIDToRecord[freebaseID];
		record.manifestations = record.manifestations.concat(manifestations);
	} else {
		this._freebaseIDToRecord[freebaseID] = {
			freebaseID: 	freebaseID,
			name: 			normalizedName,
			manifestations: manifestations
		};
	}
};

Companion.IdentityModel.prototype.getAllFreebaseIDs = function() {
	var a = [];
	for (var n in this._freebaseIDToRecord) {
		a.push(n);
	}
	return a;
};

Companion.IdentityModel.prototype.getManifestationsForFreebaseID = function(freebaseID) {
	if (freebaseID in this._freebaseIDToRecord) {
		return [].concat(this._freebaseIDToRecord[freebaseID].manifestations);
	} else {
		return [];
	}
};

Companion.IdentityModel.prototype.createManifestationIndex = function(ignore) {
	var list = [];
	var manifestationToIDs = {};
	
	for (var freebaseID in this._freebaseIDToRecord) {
		var record = this._freebaseIDToRecord[freebaseID];
		var manifestations = record.manifestations;
		
		for (var j = 0; j < manifestations.length; j++) {
			var manifestation = manifestations[j];
			var text = manifestation.text;
			if (text.toLowerCase() in ignore) {
				continue;
			}
			if (!(text in manifestationToIDs)) {
				manifestationToIDs[text] = {};
				list.push(text);
			}
			manifestationToIDs[text][freebaseID] = true;
		}
	}
	list.sort().reverse();
	
	return {
		manifestations: 	list,
		manifestationToIDs:	manifestationToIDs
	};
}