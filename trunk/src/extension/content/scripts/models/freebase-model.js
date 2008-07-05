Companion.FreebaseModel = function() {
	this._typeToProperties = {};
};

Companion.FreebaseModel.prototype.addPropertyToType = function(typeID, propertyID) {
	if (!(typeID in this._typeToProperties)) {
		this._typeToProperties[typeID] = {};
	}
	this._typeToProperties[typeID][propertyID] = true;
};

Companion.FreebaseModel.prototype.getPropertiesOfType = function(typeID) {
	if (!(typeID in this._typeToProperties)) {
		return [];
	}
	
	var a = [];
	var propertyIDs = this._typeToProperties[typeID];
	for (var n in propertyIDs) {
		a.push(n);
	}
	return a;
};
