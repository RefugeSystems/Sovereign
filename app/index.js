
var Configuration = require("a-configuration");
var StructureRouter = require("./structure/routing");
var Structure = require("./structure");
var Sovereign = require("./sovereign");

var onError = function(options) {
	return function(error) {
		switch(error.code) {
			case "EACCES":
				console.log(options.port + " requires elevated privileges");
				process.exit(1);
				break;
			case "EADDRINUSE":
				console.log(options.port + " is already in use");
				process.exit(1);
				break;
			default:
				console.log("Errored: ", error);
				throw error;
		}
	};
};

var onListening = function(options) {
	return function() {
		console.log("Listening on port " + options.port);
	};
};

Configuration
._await
.then(function() {
	var sovereign = new Sovereign(Configuration);
	var log = Configuration.systemLog;
	
	var x, csp = "default-src 'self'";
	for(x=0; x<Configuration.domains.length; x++) {
		csp += " https://" + Configuration.domains[x];
		csp += " http://" + Configuration.domains[x];
		csp += " wss://" + Configuration.domains[x];
		csp += " ws://" + Configuration.domains[x];
	}
	
	Configuration.synthetic = Configuration.synthetic || {};
	Configuration.synthetic.general = Configuration.synthetic.general || {};
	
	var bodyParser = require("body-parser");
	var express = require("express");
	var WebSocket = require("ws");
	var https = require("https");
	var http = require("http");
	var url = require("url");
	var fs = require("fs");

	var server = express();
	server.use(bodyParser.json());
	server.use(bodyParser.urlencoded({ extended: false }));
	
//	server.use("/tower/auth", authentication);
	
	server.use(function(req, res, next) {
		res.setHeader("Content-Security-Policy", csp);
		log.debug({"req": req}, "Request Received");
		next();
	});
	
	server.get("/ping", function(req,res) {
		sovereign.ping(req.body);
		res.json({"status": 0, "message": "Pinged"});
	});
	
	server.use("/structure", StructureRouter);
	
	server.use(function(req, res, next) {
		next(new Error("Location not found: " + req.url));
	});
	
	server.use(function(error, req, res, next) {
		log.error({"req": req, "error": error, "stack": error.stack}, "Request Encountered an unhandled error: " + error.message);
		res.status(error.status || 500);
		res.json({
			"message": "Encountered an Error",
			"error": error.message
		});
	});
	

	var key = fs.readFileSync(Configuration.server.key || "/opt/ssl-tower.key", "utf-8");
	var crt = fs.readFileSync(Configuration.server.crt || "/opt/ssl-tower.crt", "utf-8");

	var opened = http.createServer(server);
	var secure = https.createServer({
		"key": key,
		"cert": crt 
	}, server);
	
	var socketserver = new WebSocket.Server({"server": opened});
	socketserver.on("connection", function(connection, req) {
		var location = url.parse(req.url, true);
		if(location.path === "/connect") {
			connection.host = req.ip;
			if(req.session) {
				connection.name = req.session.name;
			} else {
				connection.name = "no-session";
			}
			sovereign.client(connection);
		}
	});
	
	secure.on("error", onError(Configuration.server.https));
	secure.on("listening", onListening(Configuration.server.https));
	secure.listen(Configuration.server.https.port);

	opened.on("error", onError(Configuration.server.http));
	opened.on("listening", onListening(Configuration.server.http));
	opened.listen(Configuration.server.http.port);
	
	Structure.defineApp(server);
});
