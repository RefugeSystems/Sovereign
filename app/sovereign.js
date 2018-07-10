
//var Synthesis = require("rs-synthesis");
//var Random = require("rs-random");
var Synthesis = require("../../Synthesis/");
var Random = require("../../Random/");
var Client = require("./client");
var Package = require("../package.json");

/**
 * 
 * @class Sovereign
 * @constructor
 * @param {Object} Configuration
 */
module.exports = function(Configuration) {
	var sovereign = this;
	
	var start = Date.now();
	var general = this.general = new Synthesis(Configuration.synthesis);
	general.setMaxListeners(0);
	
	var clients = {};
	
	this.client = function(connection) {
		var client = new Client(Random.identifier("client", 10, 32), connection, sovereign);
		clients[client.id.code] = client;
		client.on("create", clientCreate);
		client.on("repeat", clientRepeat);
		client.on("close", this.disconnect);
		console.log("Client Created: " + client.id.code);
	};
	
	
	this.ping = function(ball) {
		var x, notify = Object.keys(clients);
		for(x=0; x<notify.length; x++) {
			console.log("Pong to " + notify[x]);
			clients[notify[x]].send("pong", ball);
		}
	};
	
	
	
	this.constructs = function(constructs) {
		console.log("General Construct: ", constructs);
		if(!constructs) {
			throw new Error("No Constructs passed");
		}
		return general.retrieveConstructs(constructs);
	};
	
	
	this.disconnect = function(client) {
		delete(clients[client.id.code]);
		console.log("Client Disconnected: " + client.id.code + (client.closure.message?" - For Cause: " + client.closure.message:""));
	};
	
	
	var events = {
		"general": ["general",
			"resource:create",
			"resource:repeat",
			"resource:remove",
			"relation:create",
			"relation:repeat",
			"relation:remove"]
	};
	
	
	this.status = function() {
		var e, synthesis = {
			"general": {
				"listeners": {
				}
			}
		};
		
		for(e=0; e<events.length; e++) {
			synthesis.general.listeners[events[e]] = general.listenerCount(events[e]);
		}
		
		return {
			"service": {
				"uptime": Date.now() - start,
				"version": Package.version
			},
			"construct": synthesis
		};
	};
	
	
	var clientCreate = function(event) {
		var x;
		/* TODO : Wait for Resources to create to get IDs and then fill in
		 * the IDs by name in relations BEFORE passing relations for creation
		 * so that we prioritize filling in ambiguous names with resources that
		 * were identified in this event to fulfill cases of ambiguous names
		 * with some priority.
		 * 
		 * Otherwise the creation process will find the first resource of the
		 * given name for relationships where no ID is specified (See "soruceName"
		 * and "targetName").
		 */
		if(event.resources) {
			for(x=0; x<event.resources.length; x++) {
				console.log("Create Resource: ", JSON.stringify(event.resources[x], null, 4));
				event.resources[x].id = Random.identifier("resource", 10, 32);
				general.createResource(event.resources[x]);
			}
		}
		if(event.relations) {
			for(x=0; x<event.relations.length; x++) {
				console.log("Create Relation: ", JSON.stringify(event.relations[x], null, 4));

				event.relations[x].id = Random.identifier("relation", 10, 32);
				negotiateNaming(event.relations[x])
				.then(general.createRelation)
				.catch(faultPromised(event.clientCode, "relation", event.relations[x]));
			}
		}
	};
	
	/* Handles translating sourceName and targetName to source and target
	 * 
	 */
	var negotiateNaming = function(relation) {
		return new Promise(function(done, fail) {
			var names = [];
			if(relation.sourceName) {
				names.push(relation.sourceName);
			}
			if(relation.targetName) {
				names.push(relation.targetName);
			}
			if(names.length) {
				general.gatherNamed(names)
				.then(function(map) {
					if(relation.sourceName) {
						relation.source = map[relation.sourceName];
						delete(relation.sourceName);
						if(!relation.source) {
							throw new Error("Named source was not found");
						}
						relation.source = relation.source.id;
					}
					if(relation.targetName) {
						relation.target = map[relation.targetName];
						delete(relation.targetName);
						if(!relation.target) {
							throw new Error("Named target was not found");
						}
						relation.target = relation.target.id;
					}
					console.log("Named Relation: " + JSON.stringify(relation, null, 4));
					done(relation);
				})
				.catch(fail);
			} else {
				done(relation);
			}
		});
	};
	
	var faultPromised = function(clientCode, key, object) {
		return function(error) {
			var message = {
				"message": "Error Encountered: " + error.message,
				"stack": error.stack, // TODO: Remove for V1 and incorporate permissions for V1.5
			};
			
			message[key] = object;
			message.cause = object;
			
			clients[clientCode].send("error", message);
		};
	};
	
	
	var clientRepeat = function(event) {
		var x;
		if(event.resources) {
			for(x=0; x<event.resources.length; x++) {
				console.log("Emit Resource: " + event.resources[x]);
				general.repeatResource(event.resources[x]);
			}
		}
		if(event.relations) {
			for(x=0; x<event.relations.length; x++) {
				console.log("Create Relation: ", JSON.stringify(event.relations[x], null, 4));
				general.createRelation(event.relations[x]);
			}
		}
	};
};
