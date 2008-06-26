var FreebaseService = {};

FreebaseService.reconcile = function(entries, onDone) {
    var a = [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        a.push({ name: entry.name, freebaseTypes: entry.freebaseTypes });
    }
    
    var url = "http://localhost:8192/reconciler/";
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	try {
		url = prefs.getCharPref("metaweb.companion.reconcilerService");
	} catch (e) {
	}
	Companion.log("Using reconciler service at " + url);

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

FreebaseService.getAllRelationships = function(ids, onDone, onStatus) {
	var state = { index: 0 };
	var results = [];
	var doNext = function() {
		if (state.index >= ids.length) {
			onDone(results);
		} else {
			var start = state.index;
			var end = Math.min(start + 10, ids.length);
			
			state.index = end;
			
			FreebaseService._getAllRelationshipsInBatch(ids, start, end, function(results2) {
                onStatus("Got " + results2.length + " relationship(s) for entities " + start + " - " + end + " of " + ids.length);
    
				results = results.concat(results2);
				doNext();
			});
		}
	};
	doNext();
}

FreebaseService._getAllRelationshipsInBatch = function(ids, start, end, onDone) {
	var ids2 = ids.slice(start, end);
    var forwardQuery = [
		{
		    "master_property" : null,
		    "reverse" : null,
		    "source" : {
		      "id" : null,
		      "id|=" : ids2
		    },
		    "target" : [
		      {
		        "id" : null,
		        "name" : null
		      }
		    ],
		    "type" : "/type/link",
			"limit" : 1000
		}
	];
	var backwardQuery = [
	    {
            "master_property" : null,
            "reverse" : null,
            "target" : {
              "id" : null,
              "id|=" : ids2
            },
            "source" : [
              {
                "id" : null,
                "name" : null
              }
            ],
            "type" : "/type/link",
			"limit" : 1000
        }
    ];
	var queries = {
	   "q1": { "query": forwardQuery },
	   "q2": { "query": backwardQuery }
	};

    var url = 'http://freebase.com/api/service/mqlread?';
    var body = 'queries=' + encodeURIComponent(jsonize(queries));
    
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader("Content-Length", body.length);
    request.onreadystatechange = function() { 
		FreebaseService._getAllRelationshipsStateChangeCallback(request, onDone);
    };
    request.send(body);
};

FreebaseService._getAllRelationshipsStateChangeCallback = function(request, onDone) {
    if (request.readyState != 4) {
        //Companion.log("working...");
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "GetAllRelationships error: " +
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
		//Companion.log(request.responseText);
		var o = eval("(" + request.responseText + ")");
		var compoundResults = o.q1.result.concat(o.q2.result);
		onDone(compoundResults);
	}
};

FreebaseService.getTypeProperties = function(types, onDone) {
    var query = [
		{
			"/type/type/properties" : [],
			"id" : null,
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
		FreebaseService._getTypePropertiesStateChangeCallback(request, onDone);
    };
    request.send(body);
};

FreebaseService._getTypePropertiesStateChangeCallback = function(request, onDone) {
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
        
        onDone({});
    } else {
		var typeProperties = {};
		
		var o = eval("(" + request.responseText + ")");
		var results = o.q1.result;
		for (var i = 0; i < results.length; i++) {
			var result = results[i];
			typeProperties[result.id] = result["/type/type/properties"];
		}
		onDone(typeProperties);
	}
};
