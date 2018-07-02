
var Configuration = require("a-configuration");
var Session = require("./session.js");
var util = require("util");

/**
 * 
 * Configuration: 'rsys-handler'
 * @class RSysHandler
 * @constructor 
 * @extends SessionHandler
 * @param {Object} options Uses:show dbs
 * + options.database {String}: The name of the Mongo Database with refuge system general session information. The connection is found off of the system configuration
 */
module.exports = function(options) {
	options = options || {};
	if(!Configuration.mongo.db[options.database]) {
		throw new Error("Session Handler (RSysHandler): Unable to find mongo database connection '" + options.database + "'");
	}
	
	var collection = {};
	collection.sessions = Configuration.mongo.db[options.database].collection("sessions");
	collection.users =  Configuration.mongo.db[options.database].collection("users");
	
	this.getSession = function(req) {
		return new Promise(function(done, fail) {
			var search, result, authenticator = req.query.authenticator;
			if(authenticator) {
				search = {
					"authenticator": authenticator
				};
				
				collection.sessions
				.find(search)
				.toArray(function(err, session) {
					if(err) {
						fail(err);
					} else {
						if(session = session[0]) {
							search = {
								"username": session.username
							};
							
							collection.users
							.find(search)
							.toArray(function(err, user) {
								if(err) {
									fail(err);
								} else {
									if(user = user[0]) {
										done(new Session(user));
									} else {
										fail(new Error("Unable to find User for Session: " + session._id));
									}
								}
							});
						} else {
							done(null);
						}
					}
				});
			} else {
				fail(new Error("No authenticator key found"));
			}
		});
	};
};

util.inherits(module.exports, Session);
