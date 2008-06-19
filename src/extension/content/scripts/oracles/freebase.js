var FreebaseOracle = {};

FreebaseOracle.reconcile = function(entries, onDone) {
	var state = { index: 0 };
	var doNext = function() {
		if (state.index >= entries.length) {
			if (typeof onDone == "function") {
				onDone();
			}
			return;
		}
		
		var entry = entries[state.index++];
		Companion.log("Reconciling " + state.index + " of " + entries.length + ": " + entry.name);
	
		FreebaseOracle._reconcileEntry(entry, doNext);
	};
	doNext();
};

FreebaseOracle._reconcileEntry = function(entry, cont) {
	
	var params = [
		"name=" + escape(entry.name),
		"responseType=json"
	];
	if (entry.freebaseTypes.length > 0) {
		params.push("types=" + escape(entry.freebaseTypes.join(",")));
	}
	var url = "http://freebase.com/dataserver/reconciliation/?" + params.join("&");
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.onreadystatechange = function() { FreebaseOracle._reconcileStateChangeCallback(request, entry, cont); };
	request.send("");
};

FreebaseOracle._reconcileStateChangeCallback = function(request, entry, cont) {
    if (request.readyState != 4) {
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "FreebaseOracle reconciliation error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
        
		cont();
        return;
    }
    
	try {
		var o = eval("(" + request.responseText + ")");
		var results = o.results;
		if (results.length > 0) {
			var id = results[0].id.replace(/\\\//g, "/");
			entry.freebaseReconciliationResult = {
				uri: "http://freebase.com/view" + id
			};
		} else {
			entry.freebaseReconciliationResult = {
				error: "Unknown name"
			};
		}
	} catch (e) {
		Companion.exception(e);
	}
	
	cont();
};
