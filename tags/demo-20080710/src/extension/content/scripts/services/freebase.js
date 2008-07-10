var FreebaseService = {};

FreebaseService.reconcile = function(entries, onDone) {
    var a = [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        a.push({ name: entry.name, freebaseTypes: entry.freebaseTypes });
    }
    
	var url = Companion.getHelperURL() + "reconciler";
	//Companion.log("Using reconciler service at " + url);

    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.onreadystatechange = function() { 
        FreebaseService._reconcileBatchStateChangeCallback(request, entries, onDone) 
    };
    request.send(jsonize({ entries: a }));
};

FreebaseService._reconcileBatchStateChangeCallback = function(request, entries, cont) {
    if (request.readyState != 4) {
        //Companion.log("working...");
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "Batch reconciliation error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
        
        for (var i = 0; i < entries.length; i++) {
            entries[i].freebaseReconciliationResult = {
                error: "unknown"
            };
        }
    } else {
	    try {
			//Companion.log(request.responseText);
	        var o = eval("(" + request.responseText + ")");
			
	        var entries2 = o.entries;
	        for (var i = 0; i < entries2.length; i++) {
	            var entry = entries[i];
	            var entry2 = entries2[i];
	            if ("id" in entry2) {
	                entry.freebaseReconciliationResult = {
	                    id: entry2.id
	                };
	            } else {
	                entry.freebaseReconciliationResult = {
	                    error: entry2.error
	                };
	            }
	        }
	    } catch (e) {
	        Companion.exception(e);
	    }
    }
    cont();
};

FreebaseService.getAllRelationships = function(ids, database, onDone, onStatus, onError) {
	var state = { index: 0 };
	var doNext = function() {
		if (state.index >= ids.length) {
			onDone();
		} else {
			var start = state.index;
			var end = Math.min(start + 5, ids.length);
			
			state.index = end;
			
			FreebaseService._getAllRelationshipsInBatch(ids, start, end, function(items) {
                onStatus("Got " + items.length + " record(s) for entities " + start + " - " + end + " of " + ids.length);
				
				database.loadData({ "items" : items }, "");
				
				doNext();
			}, onError);
		}
	};
	doNext();
}

FreebaseService._getAllRelationshipsInBatch = function(ids, start, end, onDone, onError) {
	var ids2 = ids.slice(start, end);
	
	var url = Companion.getHelperURL() + "fact-finder";
	//Companion.log("Using fact finder service at " + url);
	
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.onreadystatechange = function() { 
		FreebaseService._getAllRelationshipsStateChangeCallback(request, onDone, onError);
    };
    request.send(jsonize({ "ids" : ids2 }));
};

FreebaseService._getAllRelationshipsStateChangeCallback = function(request, onDone, onError) {
    if (request.readyState != 4) {
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "GetAllRelationships error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
        
		onError(request);
    } else {
		var o = eval("(" + request.responseText + ")");
		onDone(o.items);
	}
};

FreebaseService.getSchema = function(database, freebaseModel, onDone, onError) {
	var types = database.getAllTypes();
    var query = [
		{
			"/type/type/properties" : [{
                "id" : null,
                "name" : null,
				"expected_type" : [{ "id" : null, "name" : null, "/freebase/type_hints/mediator" : null, "optional" : true }]
            }],
			"id" : null,
			"name" : null,
			"id|=" : types
		}
	];
	var queries = {
	   "q1": { "query": query }
	};

    var url = 'http://freebase.com/api/service/mqlread?';
	var json = jsonize(queries);
    var body = 'queries=' + encodeURIComponent(json);
    
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader("Content-Length", body.length);
    request.onreadystatechange = function() { 
		FreebaseService._getTypePropertiesStateChangeCallback(database, freebaseModel, request, onDone, onError);
    };
    request.send(body);
};

FreebaseService._getTypePropertiesStateChangeCallback = function(database, freebaseModel, request, onDone, onError) {
    if (request.readyState != 4) {
        //Companion.log("working...");
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "GetTypeProperties error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
		
		onError(request.statusText);
    } else {
		try {
			var o = eval("(" + request.responseText + ")");
			var typePropertyEntries = o.q1.result;
			
		    for (var i = 0; i < typePropertyEntries.length; i++) {
		        var typePropertyEntry = typePropertyEntries[i];
				
				var typeRecord = database.getType(typePropertyEntry.id);
				if (typeRecord != null) {
					typeRecord._label = typeRecord._pluralLabel = typePropertyEntry.name;
				}
				
		        var propertyEntries = typePropertyEntry["/type/type/properties"];
		        var propertyIDs = [];
		        
		        for (var j = 0; j < propertyEntries.length; j++) {
		            var propertyEntry = propertyEntries[j];
		            var propertyRecord = database.getPropertyForced(propertyEntry.id);
					
		            propertyIDs.push(propertyEntry.id);
					
					propertyRecord._label = propertyRecord._pluralLabel = propertyEntry.name;
					if ("expected_type" in propertyEntry) {
						var expectedTypes = propertyEntry["expected_type"];
						if (expectedTypes.length > 0) {
							var expectedType = expectedTypes[0];
							propertyRecord._expectedType = expectedType.id;
							propertyRecord._expectedTypeLabel = expectedType.name;
							propertyRecord._isCVT = expectedType["/freebase/type_hints/mediator"] == true;
						}
					}
					
					freebaseModel.addPropertyToType(typePropertyEntry.id, propertyEntry.id);
		        }
		    }
			onDone();
		} catch (e) {
			onError(e.toString());
		}
	}
};
