
//var Synthesis = require("rs-synthesis");
//var Random = require("rs-random");
var Synthesis = require("../../Synthesis/");
var Random = require("../../Random/");
var Client = require("./client");

/**
 * 
 * @class Sovereign
 * @constructor
 * @param {Object} Configuration
 */
module.exports = function(Configuration) {
	var sovereign = this;
	
	var general = this.general = new Synthesis(Configuration.synthesis);
	
	var clients = {};
	
	this.client = function(connection) {
		var client = Random.string(10) + Date.now();
		client += Random.string(32 - client.length);
		client = new Client(client, connection, sovereign);
		clients[client.id.code] = client;
		client.on("create", clientCreate);
		client.on("repeat", clientRepeat);
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
				general.createResource(event.resources[x]);
			}
		}
		if(event.relations) {
			for(x=0; x<event.relations.length; x++) {
				console.log("Create Relation: ", JSON.stringify(event.relations[x], null, 4));
				general.createRelation(event.relations[x]);
			}
		}
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
