
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
	var client = this;
	this.setMaxListeners(5);
	this.id = {
		"code": id,
		"username": connection.session?connection.session.username:"anonymous",
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
	 * @param {String} key Event key for this data
	 * @param {Object | Array} data Object to send
	 */
	this.send = function(key, data) {
		connection.send(JSON.stringify({
			"key": key,
			"data": data
		}));
	};
	
	
	var receiveGeneral = function(event) {
		connection.send(JSON.stringify({
			"origin": "general",
			"event": event
		}));
	};
	
	
	connection.on("message", function(event) {
		try {
			event = JSON.parse(event);
			console.log("Message Recevied: ", event);
			if(event && event.data && event.data.key) {
				if(event.sent) {
					event.delay = Date.now() - event.sent;
					client.id.stats.lag = client.id.stats.lag * 2 + event.delay;
					client.id.stats.lag /= 2;
				}
				
				event.data.clientCode = client.id.code;
				switch(event.data.key) {
					case "identity":
						client.send(client.id);
						break;
					default:
						console.log("Message: " + JSON.stringify(event.data, null, 4));
						client.emit(event.data.key, event.data);
				}
			}
		} catch(exception) {
			console.log("Invalid Message: ", exception);
		}
	});
	
	
	connection.on("error", function(event) {
		console.log("Client Error: ", event);
		event = event || {};
		
		client.closure = {};
		client.closure.message = event.message || "No Message";
		client.closure.event = event;
		
		client.emit("close", client);
		sovereign.general.removeListener("general", receiveGeneral);
	});
	
	
	connection.on("close", function(event) {
		console.log("Client Closed: ", event);
		event = event || {};
		
		client.closure = {};
		client.closure.message = event.message;
		client.closure.event = event;
		
		client.emit("close", client);
		sovereign.general.removeListener("general", receiveGeneral);
	});
	
	/**
	 * 
	 * @method close
	 */
	this.close = function() {
		
	};
	
	
	sovereign.general.on("general", receiveGeneral);
};

util.inherits(module.exports, EventEmitter);
