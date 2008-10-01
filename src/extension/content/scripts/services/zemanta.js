var ZemantaService = {};

ZemantaService.analyzeText = function(text, onDone, onError) {
    var licenseID = "8tn43mu8fvkcffmfshmmjnsh";
    var payload = [
        "method=zemanta.suggest",
        "api_key=" + escape(licenseID),
        "format=json",
        "freebase=1",
        "text=" + escape(text)
    ].join("&");
    
    var request = new XMLHttpRequest();
    var job = {
        request:    request,
        onDone:     onDone,
        onError:    onError
    };
    
    request.open("POST", "http://api.zemanta.com/services/rest/0.0/", true);
    request.onreadystatechange = function() { ZemantaService._stateChangeCallback(job); };
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader("Content-Length", payload.length);
    
    request.send(payload);
};

ZemantaService._stateChangeCallback = function(job) {
    var request = job.request;
    //Companion.log(request.readyState);
    if (request.readyState != 4) {
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "Companion error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
        
        if (job.onError) {
            job.onError(request);
        }
        return;
    }
    
    if (job.onDone) {
        try {
            var o = eval("(" + request.responseText + ")");
            job.onDone(o);
        } catch (e) {
            Companion.exception(e);
            job.onError(request, e);
        }
    }
};
