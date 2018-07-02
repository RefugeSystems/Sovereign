
var Configuration = require("a-configuration");
var Session = require("./session.js");
var util = require("util");

/**
 * Special session handler that always fails with an error.
 * 
 * Useful for debugging and development.
 * 
 * Configuration: 'fail-handler'
 * @class FailHandler
 * @constructor 
 * @extends SessionHandler
 * @param {Object} options Uses:  
 * + options.message {String}: The message to use inside the error
 */
module.exports = function(options) {
	options = options || {};
	
	this.getSession = function(req) {
		Configuration.systemLog.debug({"req": req, "sessionHandler": "fail-handler"}, "Fail handler failed session");
		return new Promise(function(done, fail) {
			fail(new Error(options.message || "Test Fault from 'fail-handler' Session Handler"));
		});
	};
};

util.inherits(module.exports, Session);
