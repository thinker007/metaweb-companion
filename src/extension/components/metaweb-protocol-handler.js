var chromeContentPath;

var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
function log(msg) {
	consoleService.logStringMessage(msg);
};

const MetawebScheme = "metaweb";
const MetawebProtocolName = "metaweb: URI scheme";
const MetawebProtocolContractID = "@mozilla.org/network/protocol;1?name=" + MetawebScheme;
const MetawebProtocolCID = Components.ID("{3a92fc7e-ad74-4aff-a6ef-2c3316075bbc}");


var MetawebProtocolHandlerModule = {
	registerSelf: function (compMgr, fileSpec, location, type) {
		var compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(
			MetawebProtocolCID,
			MetawebProtocolName,
			MetawebProtocolContractID,
			fileSpec, 
			location, 
			type);
		
		//var categoryManager = Components.classes['@mozilla.org/categorymanager;1'].getService(Components.interfaces.nsICategoryManager);
		//categoryManager.addCategoryEntry('protocol', MetawebScheme, MetawebProtocolContractID, true, true);

		this._initialize();
	},
	getClassObject: function (compMgr, cid, iid) {
		if (!cid.equals(MetawebProtocolCID)) {
			throw Components.resuls.NS_ERROR_NO_INTERFACE;
		} else if (!iid.equals(Components.interfaces.nsIFactory)) {
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		} else {
			return MetawebProtocolFactory;
		}
	},
	canUnload: function (compMgr) {
		return true;
	},
	_initialize: function() {
		chromeContentPath = this._getChromeContentPath();
	},
	_getChromeContentPath: function() {
	    var chromeRegistry =
	        Components.classes["@mozilla.org/chrome/chrome-registry;1"]
	            .getService(Components.interfaces.nsIChromeRegistry);
				
	    var uri =
	        Components.classes["@mozilla.org/network/standard-url;1"]
	            .createInstance(Components.interfaces.nsIURI);
	    uri.spec = "chrome://companion/content/";

	    var path = chromeRegistry.convertChromeURL(uri);
	    if (typeof(path) == "object") {
			path = path.spec;
		}

	    return path;
	}
};
function NSGetModule() {
	return MetawebProtocolHandlerModule;
}

var MetawebProtocolFactory = {
	createInstance: function (outer, iid) {
		if (outer != null) {
			throw Components.results.NS_ERROR_NO_AGGREGATION;
		} else if (!iid.equals(Components.interfaces.nsIProtocolHandler) && 
				   !iid.equals(Components.interfaces.nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		} else {
			return new MetawebProtocol();
		}
	}
};

function MetawebProtocol() {
}

MetawebProtocol.prototype = {
	QueryInterface: function(iid) {
		if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
			!iid.equals(Components.interfaces.nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},
      
	scheme: 		MetawebScheme,
	defaultPort: 	-1,
	
	protocolFlags: 
		Components.interfaces.nsIProtocolHandler.URI_NORELATIVE |
		Components.interfaces.nsIProtocolHandler.URI_NOAUTH,
	
	allowPort: function(port, scheme) {
		return false;
	},

	newURI: function(spec, charset, baseURI) {
		var uri = Components.classes["@mozilla.org/network/simple-uri;1"].createInstance(Components.interfaces.nsIURI);
		uri.spec = spec;
		return uri;
	},

	newChannel: function(metawebUri) {
		var ioService = Components.classesByID["{9ac9e770-18bc-11d3-9337-00104ba0fd40}"].
			getService().
			QueryInterface(Components.interfaces.nsIIOService);
		
		var metawebUriSpec = metawebUri.spec;
		metawebUriSpec = metawebUriSpec.substr((MetawebScheme + ":").length);
		
		var fileURL;
		if (metawebUriSpec.substr(0,10) == "resources/") {
			fileURL = chromeContentPath + "metaweb-commands/" + metawebUriSpec.substr(10);
		} else {
			var question = metawebUriSpec.indexOf("?");
			if (question < 1) {
				return ioService.newChannelFromURI(ioService.newURI("about:blank", null, null));
			}
			
			//return ioService.newChannelFromURI(ioService.newURI("http://google.com/", null, null));
			
			var command = metawebUriSpec.substr(0, question);
			fileURL = chromeContentPath + "metaweb-commands/" + command + ".html";
		}
		
		var fileUri = ioService.newURI(fileURL, null, null);
		var channel = ioService.newChannelFromURI(fileUri);
		
		return channel;
	}
};
