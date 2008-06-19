var OpenCalaisUtil = {};

OpenCalaisUtil._entityTypeMap = {
    "Anniversary": {
        "freebaseTypes": [
        ]
    },
    "City": {
        "freebaseTypes": [
        ]
    },
    "Company": {
        "freebaseTypes": [
        ]
    },
    "Continent": {
        "freebaseTypes": [
        ]
    },
    "Country": {
        "freebaseTypes": [
        ]
    },
    "Currency": {
        "freebaseTypes": [
        ]
    },
    "EmailAddress": {
        "freebaseTypes": [
        ]
    },
    "EntertainmentAwardEvent": {
        "freebaseTypes": [
        ]
    },
    "Facility": {
        "freebaseTypes": [
        ]
    },
    "FaxNumber": {
        "freebaseTypes": [
        ]
    },
    "Holiday": {
        "freebaseTypes": [
        ]
    },
    "IndustryTerm": {
        "freebaseTypes": [
        ]
    },
    "MedicalCondition": {
        "freebaseTypes": [
        ]
    },
    "Movie": {
        "freebaseTypes": [
        ]
    },
    "MusicAlbum": {
        "freebaseTypes": [
        ]
    },
    "MusicGroup": {
        "freebaseTypes": [
        ]
    },
    "NaturalDisaster": {
        "freebaseTypes": [
        ]
    },
    "NaturalFeature": {
        "freebaseTypes": [
        ]
    },
    "Organization": {
        "freebaseTypes": [
        ]
    },
    "Person": {
        "freebaseTypes": [
            "/people/person"
        ]
    },
    "PhoneNumber": {
        "freebaseTypes": [
        ]
    },
    "Product": {
        "freebaseTypes": [
        ]
    },
    "ProvinceOrState": {
        "freebaseTypes": [
        ]
    },
    "PublishedMedium": {
        "freebaseTypes": [
        ]
    },
    "Region": {
        "freebaseTypes": [
        ]
    },
    "SportsEvent": {
        "freebaseTypes": [
        ]
    },
    "SportsGame": {
        "freebaseTypes": [
        ]
    },
    "Technology": {
        "freebaseTypes": [
        ]
    },
    "TVShow": {
        "freebaseTypes": [
        ]
    },
    "URL": {
        "freebaseTypes": [
        ]
    }
};

OpenCalaisUtil.analyzeText = function(text, onDone, onError) {
    var licenseID = "an5h4pb7gyhufuusfeakhvrs";
    var payload = [
        "UID=0",
        "typeID=1",
        "licenseID=" + escape(licenseID),
        "type=" + escape("text/txt"),
        "content=" + escape(text),
        "paramsXML=" + escape(
            '<c:params xmlns:c="http://s.opencalais.com/l/pred/" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' +
                '<c:processingDirectives c:contentType="text/txt" c:outputFormat="xml/rdf">' +
                '</c:processingDirectives>' + 
            "</c:params>"
        )
    ].join("&");
    
    var request = new XMLHttpRequest();
    var job = {
        request:    request,
        onDone:     onDone,
        onError:    onError
    };
    
    /*
    request.open("POST", "http://api.opencalais.com/enlighten/calais.asmx/Enlighten", true);
    request.onreadystatechange = function() { OpenCalaisUtil._stateChangeCallback(job); };
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader("Content-Length", payload.length);
    */
    request.open("POST", "http://sws.clearforest.com/ws/sws.asmx/TagIT", true);
    request.onreadystatechange = function() { OpenCalaisUtil._stateChangeCallback(job); };
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader('User-Agent', 'Gnosis (compatible; Mozilla 5.0, Yoav Gever)');
    request.setRequestHeader("Content-Length", payload.length);
    
    request.send(payload);
};

OpenCalaisUtil._stateChangeCallback = function(job) {
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
	    var textNode = request.responseXML.firstChild.firstChild;
	    var xmlstr = "";
	    while (textNode != null) {
	        xmlstr += textNode.nodeValue;
	        textNode = textNode.nextSibling;
	    }
	    
        var xml = (new DOMParser()).parseFromString(xmlstr,"text/xml");
        job.onDone(xml); // document element
    }
};
