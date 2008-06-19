var OpenCalaisUtil = {};

OpenCalaisUtil.entityTypeMap = {
    "Anniversary": {
        "freebaseTypes": [
        ]
    },
    "City": {
        "freebaseTypes": [
            "/location/citytown"
        ]
    },
    "Company": {
        "freebaseTypes": [
            "/business/company"
        ]
    },
    "Continent": {
        "freebaseTypes": [
        ]
    },
    "Country": {
        "freebaseTypes": [
            "/location/country"
        ]
    },
    "Currency": {
        "freebaseTypes": [
            "/finance/currency"
        ]
    },
    "EmailAddress": {
        "freebaseTypes": [
        ]
    },
    "EntertainmentAwardEvent": {
        "freebaseTypes": [
            "/award/award"
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
            "/time/holiday"
        ]
    },
    "IndustryTerm": {
        "freebaseTypes": [
        ]
    },
    "MedicalCondition": {
        "freebaseTypes": [
            "/medicine/disease"
        ]
    },
    "Movie": {
        "freebaseTypes": [
            "/film/film"
        ]
    },
    "MusicAlbum": {
        "freebaseTypes": [
            "/music/album"
        ]
    },
    "MusicGroup": {
        "freebaseTypes": [
            "/music/musical_group"
        ]
    },
    "NaturalDisaster": {
        "freebaseTypes": [
            "/user/skud/disaster/disaster"
        ]
    },
    "NaturalFeature": {
        "freebaseTypes": [
            "/geography/geographical_feature"
        ]
    },
    "Organization": {
        "freebaseTypes": [
            "/organization/organization"
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
            "/business/consumer_product"
        ]
    },
    "ProvinceOrState": {
        "freebaseTypes": [
            "/location/us_state",
            "/location/province"
        ]
    },
    "PublishedMedium": {
        "freebaseTypes": [
        ]
    },
    "Region": {
        "freebaseTypes": [
            "/location/region"
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
            "/tv/tv_program"
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
