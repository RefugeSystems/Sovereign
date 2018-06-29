
var EventEmitter = require("events");
var util = require("util");

/**
 * 
 * @class Client
 * @constructor
 * @param {WebSocket} connection
 * @param {Object} configuration
 */
module.exports = function(id, connection, sovereign) {
	console.log("Create Client");
	var client = this;
	this.id = {
		"code": id,
		"connection": connection,
		"stats": {
			"lag": 0
		}
	};
	
	/**
	 * 
	 * @property constructs
	 * @type Object
	 */	
	this.constructs = {};
	
	/**
	 * 
	 * @method send
	 * @param {Object | Array} data Object to send
	 */
	this.send = function(key, data) {
		connection.send(JSON.stringify({
			"key": key,
			"data": data
		}));
	};
	
	
	sovereign.general.on("general", function(event) {
		connection.send(JSON.stringify({
			"origin": "general",
			"event": event
		}));
	});
	
	
	connection.on("message", function(event) {
		try {
			event = JSON.parse(event);
			console.log("Message Recevied");
			if(event && event.key) {
				if(event.sent) {
					event.delay = Date.now() - event.sent;
					client.id.stats.lag = client.id.stats.lag * 2 + event.delay;
					client.id.stats.lag /= 2;
				}
				
				switch(event.key) {
					case "identity":
						client.send(client.id);
						break;
					default:
						console.log("Message: " + JSON.stringify(event, null, 4));
						client.emit(event.key, event);
				}
			}
		} catch(exception) {
			console.log("Invalid Message: ", exception);
		}
	});
	
	
	connection.on("error", function(event) {
		event = event || {};
		var error = {};

		error.message = "Connection Error: " + (event.message || "No Message");
		error.event = event;
		
		client.emit("error", error);
	});
	
	/**
	 * 
	 * @method close
	 */
	this.close = function() {
		
	};
};

util.inherits(module.exports, EventEmitter);
