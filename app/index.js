/*

var test = new WebSocket("ws://localhost:3000/connect");
test.onerror = function(error) {console.log("Err: ", error);};
test.onmessage = function(data) {console.log("Data: ", data);};
test.onclose = function(code) {console.log("Code: ", code);};

 */


var configuration = require("a-configuration");

var onError = function(error) {
	switch(error.code) {
		case "EACCES":
			console.log(configuration.server.port + " requires elevated privileges");
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.log(configuration.server.port + " is already in use");
			process.exit(1);
			break;
		default:
			console.log("Errored: ", error);
			throw error;
	}
};

var onListening = function() {
	console.log("Listening on port " + configuration.server.port);
};

configuration
._await
.then(function() {
	var x, csp = "default-src 'self'";
	for(x=0; x<configuration.domains.length; x++) {
		csp += " https://" + configuration.domains[x];
		csp += " http://" + configuration.domains[x];
		csp += " wss://" + configuration.domains[x];
		csp += " ws://" + configuration.domains[x];
	}
	
	var bodyParser = require("body-parser");
	var express = require("express");
	var WebSocket = require("ws");
	var https = require("https");
	var http = require("http");
	var util = require("util");
	var url = require("url");
	var fs = require("fs");

	var server = express();
	server.use(bodyParser.json());
	server.use(bodyParser.urlencoded({ extended: false }));
//	server.use("/tower/auth", authentication);
	server.use(function(req, res, next) {
		res.setHeader("Content-Security-Policy", csp);
		next();
	});
	server.all("/ping", function(req,res) {
		console.log("ping");
		emit("ping", Object.assign({}, req.query, req.params, req.body));
		res.json({"status": 0, "message": "Pinged"});
	});

	var key = fs.readFileSync(configuration.server.key || "/opt/ssl-tower.key", "utf-8");
	var crt = fs.readFileSync(configuration.server.crt || "/opt/ssl-tower.crt", "utf-8");

	var opened = http.createServer(server);
	var secure = https.createServer({
		"key": key,
		"cert": crt 
	}, server);
	
	
	var listeners = [];
	var index, id = 0;
	
	var emit = function(key, data) {
		for(index=0; index<listeners.length; index++)
			try {
				listeners[index].event(key, data);
			} catch(ex) {
				listeners.splice(index--, 1);
			}
	};
	
	var Connective = function(socket) {
		var connective = this;
		this.id = id++;
		
		this.send = function(data) {
			socket.send(data);
		};
		
		var receive = function(data) {
			console.log("Listener[" + connective.id + "]: " + data);
		};
		
		var errored = function(error) {
			console.log("Dropped Listener: " + connective.id);
			listeners.splice(listeners.indexOf(connective), 1);
		};
		
		socket.on("message", receive);
		
		this.event = function(key, data) {
			console.log("Event[" + connective.id + "]@" + key);
			socket.send(JSON.stringify({
				"event": key,
				"data": data
			}));
		};
		
		socket.onerror = errored;
		
		console.log("Listener created: " + id);
	};
	
	var socketserver = new WebSocket.Server({"server": opened});
	socketserver.on("connection", function(ws, req) {
		var location = url.parse(req.url, true);
//		console.log("Socket Location: " + location.path);
		
		if(location.path === "/connect") {
			listeners.push(new Connective(ws));
		}
	});
	
	socketserver.on("close", function(ws, req) {
		console.log("Socket Server Closed: ", ws, req);
	});
	
	socketserver.on("open", function(ws, req) {
		console.log("Socket Server Open: ", ws, req);
	});
	
	socketserver.on("mount", function(ws, req) {
		console.log("Socket Server Mount: ", ws, req);
	});
	
	socketserver.on("listening", function(ws, req) {
		console.log("Socket Server Listening");
	});
	
	socketserver.on("upgrade", function(ws, req) {
		console.log("Socket Server Upgrade: ", ws, req);
	});
	
	socketserver.on("error", function(ws, req) {
		console.log("Socket Server Error: ", ws, req);
	});

	secure.on("error", onError);
	secure.on("listening", onListening);
	secure.listen(3100);

	opened.on("error", onError);
	opened.on("listening", onListening);
	opened.listen(3000);
});
