var FreebaseOracle = {};
FreebaseOracle._batchSize = 10;

FreebaseOracle.reconcile = function(entries, onDone) {
    var state = { index: 0 };
    var doNext = function() {
        if (state.index >= entries.length) {
            if (typeof onDone == "function") {
                onDone();
            }
            return;
        }
        
        var start = state.index;
        var end = Math.min(start + FreebaseOracle._batchSize, entries.length);
        state.index = end;
        
        Companion.log("Reconciling entries " + start + " to " + end + " of " + entries.length);
    
        FreebaseOracle._reconcileBatch(entries, start, end, doNext);
    };Companion.log("here");
    doNext();
};

FreebaseOracle._reconcileBatch = function(entries, start, end, cont) {
    var a = [];
    for (var i = start; i < end; i++) {
        var entry = entries[i];
        a.push({ name: entry.name, freebaseTypes: entry.freebaseTypes });
    }
    
    var url = "http://batchreconcile.dfhuynh.user.acre.metaweb.com/acre/";
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.onreadystatechange = function() { 
        FreebaseOracle._reconcileBatchStateChangeCallback(request, entries, start, end, cont) 
    };
    request.send(jsonize({ entries: a }));
};

FreebaseOracle._reconcileBatchStateChangeCallback = function(request, entries, start, end, cont) {
    if (request.readyState != 4) {
        Companion.log("working...");
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "Batch reconciliation error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
        
        for (var i = start; i < end; i++) {
            entries[i].freebaseReconciliationResult = {
                error: "unknown"
            };
        }
    } else {
	    try {
	        var o = eval("(" + request.responseText + ")");
	        var entries2 = o.entries;
	        for (var i = 0; i < entries2.length; i++) {
	            var entry = entries[start + i];
	            var entry2 = entries2[i];
	            if ("uri" in entry2) {
	                entry.freebaseReconciliationResult = {
	                    uri: entry2.uri
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