
//var Random = require("rs-random");
var Random = require("../../../Random/");

/**
 * 
 * @class Session
 * @constructor
 */
module.exports = function(source) {
	var x;
	
	this.name = source.name || Random.identifier("session", 5, 16);
	this.username = source.username;
	this.display = source.display;
	this.established = Date.now();
	this.last = this.established;
	
	/**
	 * Uses keys to maps operation names to secondary Objects that map
	 * clearance strings to their Integer values for this session.
	 * 
	 * Currently a clearance of 0 or undefined yields access denied, while
	 * any other value for clearance should be considered allowed.
	 * 
	 * If authorizations is the literal value "true", then the Session is
	 * considered to be allowed to perform all operations without question.
	 * 
	 * @property authorizations
	 * @type Object | Boolean
	 * @default {}
	 */
	var authorizations = {};
	if(source.authorizations) {
		if(source.authorizations.constructor.name === "Array") {
			for(x=0; x<source.authorizations; x++) {
				Object.assign(authorizations, source.authorizations[x]);
			}
		} else if(source.authorizations.constructor.name === "Object") {
			Object.assign(authorizations, source.authorizations);
		} else {
			authorizations = source.authorizations; 
		}
	}
	
	/**
	 * 
	 * @method authorization
	 * @param {Object} opSet Maps operations to access clearance for this session.
	 */
	this.authorization = function(opSet) {
		if(opSet.constructor.name === "Object") {
			authorizations = opSet.clone();
		} else if(opSet === true) {
			authorizations = true;
		}
	};
	
	/**
	 * 
	 * @method authorized
	 * @param {String} operation
	 * @param {String} clearance
	 * @return {Integer} 
	 */
	var authoized = this.authorized = function(operation, clearance) {
		if(authorizations === true) {
			return 10;
		} else if(authorizations[operation] && authorizations[operation][clearance]) {
			var result = parseInt(authorizations[operation][clearance]);
			return isNaN(result)?0:result;
		}
		return 0;
	};
	
	/**
	 * Used for checking authorization in promise chains where the operation
	 * and clearance are properties of the object being passed down the chain.
	 * @method checkAuthorization
	 * @param {String} operation
	 * @param {String} clearance
	 * @return {Promise} 
	 */
	this.checkAuthorization = function(chain) {
		return new Promise(function(done, fail) {
			if(authoized(chain.operation, chain.clearance)) {
				done(chain);
			} else {
				fail(new Error("Access denied by authorization restrictions"));
			}
		});
	};
};
