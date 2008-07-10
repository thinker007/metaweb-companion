var chromeContentPath;

var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
function log(msg) {
	consoleService.logStringMessage(msg);
};

const DatawebScheme = "dataweb";
const DatawebProtocolName = "dataweb: URI scheme";
const DatawebProtocolContractID = "@mozilla.org/network/protocol;1?name=" + DatawebScheme;
const DatawebProtocolCID = Components.ID("{3a92fc7e-ad74-4aff-a6ef-2c3316075bbc}");


var DatawebProtocolHandlerModule = {
	registerSelf: function (compMgr, fileSpec, location, type) {
		var compMgr = compMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		compMgr.registerFactoryLocation(
			DatawebProtocolCID,
			DatawebProtocolName,
			DatawebProtocolContractID,
			fileSpec, 
			location, 
			type);

		this._initialize();
	},
	getClassObject: function (compMgr, cid, iid) {
		if (!cid.equals(DatawebProtocolCID)) {
			throw Components.resuls.NS_ERROR_NO_INTERFACE;
		} else if (!iid.equals(Components.interfaces.nsIFactory)) {
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		} else {
			return DatawebProtocolFactory;
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
	return DatawebProtocolHandlerModule;
}

var DatawebProtocolFactory = {
	createInstance: function (outer, iid) {
		if (outer != null) {
			throw Components.results.NS_ERROR_NO_AGGREGATION;
		} else if (!iid.equals(Components.interfaces.nsIProtocolHandler) && 
				   !iid.equals(Components.interfaces.nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		} else {
			return new DatawebProtocol();
		}
	}
};

function DatawebProtocol() {
}

DatawebProtocol.prototype = {
	QueryInterface: function(iid) {
		if (!iid.equals(Components.interfaces.nsIProtocolHandler) &&
			!iid.equals(Components.interfaces.nsISupports)) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},
      
	scheme: 		DatawebScheme,
	defaultPort: 	-1,
	
	protocolFlags: 
		Components.interfaces.nsIProtocolHandler.URI_NORELATIVE
		| Components.interfaces.nsIProtocolHandler.URI_IS_UI_RESOURCE,
	
	allowPort: function(port, scheme) {
		return false;
	},

	newURI: function(spec, charset, baseURI) {
		var uri = Components.classes["@mozilla.org/network/simple-uri;1"].createInstance(Components.interfaces.nsIURI);
		uri.spec = spec;
		return uri;
	},

	newChannel: function(datawebUri) {
		var ioService = Components.classesByID["{9ac9e770-18bc-11d3-9337-00104ba0fd40}"].
			getService().
			QueryInterface(Components.interfaces.nsIIOService);
		
		var datawebUriSpec = datawebUri.spec;
		datawebUriSpec = datawebUriSpec.substr((DatawebScheme + ":").length);
		
		var fileURL;
		if (datawebUriSpec.substr(0,10) == "resources/") {
			fileURL = chromeContentPath + "dataweb-commands/" + datawebUriSpec.substr(10);
		} else {
			var question = datawebUriSpec.indexOf("?");
			if (question < 1) {
				return ioService.newChannelFromURI(ioService.newURI("about:blank", null, null));
			}
			
			//return ioService.newChannelFromURI(ioService.newURI("http://google.com/", null, null));
			
			var command = datawebUriSpec.substr(0, question);
			fileURL = chromeContentPath + "dataweb-commands/" + command + ".xul";
		}
		
		var fileUri = ioService.newURI(fileURL, null, null);
		var channel = ioService.newChannelFromURI(fileUri);
		
		return channel;
	}
};
