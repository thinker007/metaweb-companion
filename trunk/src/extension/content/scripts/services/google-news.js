var GoogleNewsService = {};

GoogleNewsService.getNews = function(labels, articlesPerTopic, onDone, onStatus, onError) {
	var index = 0;
	var results = [];
	var doNext = function() {
		if (index >= labels.length) {
			var urls = [];
			var hasIt = {};
			for (var i = 0; i < results.length; i++) {
				var url = results[i];
				if (!(url in hasIt)) {
					hasIt[url] = true;
					urls.push(url);
				}
			}
			onDone(urls);
		} else {
			var label = labels[index++];
			Companion.log("Getting news for topic " + label);
			GoogleNewsService._getNewsForOneTopic(label, articlesPerTopic, function(urls) {
				results = results.concat(urls);
				timeOutDoNext();
			}, onError);
		}
	};
	var timeOutDoNext = function() {
		window.setTimeout(doNext, 5000);
	};
	doNext();
}

GoogleNewsService._getNewsForOneTopic = function(topic, articlesPerTopic, onDone, onError) {
	var url = "http://news.google.com/news?output=rss&q=" + encodeURIComponent(topic);
	
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.onreadystatechange = function() { 
		GoogleNewsService._getNewsForOneTopicStateChangeCallback(articlesPerTopic, request, onDone, onError);
    };
    request.send("");
};

GoogleNewsService._getNewsForOneTopicStateChangeCallback = function(articlesPerTopic, request, onDone, onError) {
    if (request.readyState != 4) {
        return;
    }
    
    if (request.status != 200) {
        Companion.log(
            "getNews error: " +
            "state = " + request.readyState + 
            " status = " + request.status +
            " text = " + request.responseText
        );
        
		onError(request);
    } else {
		var urls = [];
		try {
			var xml = request.responseXML;
			var iterator = xml.evaluate("/rss/channel/item/link", xml, null, XPathResult.ANY_TYPE, null);
			var item = iterator.iterateNext();
			while ((item) && urls.length < articlesPerTopic) {
				urls.push(item.firstChild.nodeValue);
				item = iterator.iterateNext();
			}
		} catch (e) {
			onError(e);
		}
		onDone(urls);
	}
};
