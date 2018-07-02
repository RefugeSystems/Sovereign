
/**
 * A Session Class Implements the necessary functionality to retrieve a user session and configure
 * the permissions for actions accordingly.
 * 
 * This serves more for documentation for writing a Session Handler than for providing functionality
 * at this time.
 * 
 * @class SessionHandler
 * @constructor
 * @abstract
 * @param {Object} options Passed by the system from Configuration.session
 */
module.exports = function() {
	
	
	
	/**
	 * 
	 * @method getSession
	 * @param {ExpressRequest} req The incoming request to identify
	 * @return {Promise | Session} Returns a Promise that fulfills with a Session
	 * 	OBject
	 */
	this.getSession = function() {
		return new Promise(function(done, fail) {
			fail(new Error("Not Implemented"));
		});
	};
};
