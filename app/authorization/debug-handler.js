
var Configuration = require("a-configuration");
var Session = require("./session.js");
var util = require("util");

/**
 * A special handler that succeeds all requests with a default generic session.
 * 
 *  The default generic session has administrative privileges but options can set the authorizations that
 *  should be established.
 *  
 *  The "name" for the session is always "debugging#" and then the instance number for the session. This is
 *  constant for log searching.
 * 
 * Useful for development and debugging.
 * 
 * Configuration: 'debug-handler'
 * @class DebugHandler
 * @constructor 
 * @extends SessionHandler
 * @param {Object} options Uses:
 * + display {String} : Display name for the session
 * + username {String} : Username for the session
 * + options.authorizations {Object} : Sets the authorizations for the session, defaults to true
 */
module.exports = function(options) {
	options = options || {};
	var id = 0;
	
	this.getSession = function(req) {
		return new Promise(function(done) {
			Configuration.systemLog.debug({"req": req, "sessionHandler": "debug-handler"}, "Debug handler fulfilled session");
			done(new Session({
				"name": "debugging#" + id++,
				"username": options.username || "debug-mode",
				"display": options.display || "Debug User",
				"authorizations": options.authorizations || true
			}));
		});
	};
};

util.inherits(module.exports, Session);
