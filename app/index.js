
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var express = require("express");
var WebSocket = require("ws");
var https = require("https");
var http = require("http");
var url = require("url");
var fs = require("fs");

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
	
	Configuration.session = Configuration.session || {};	
	Configuration.session.handler = Configuration.session.handler || "rsys-handler";
	if(!Configuration.session.handler.endsWith("-handler") || Configuration.session.handler.indexOf("/") !== -1) {
		throw new Error("Invalid Session Handler '" + Configuration.session.handler + "': Handlers must end with 'handler' and can only be located in the app/authorization folder or be installed as a node module");
	}
	
	var SessionHandler;
	try {
		SessionHandler = require("./authorization/" + Configuration.session.handler + ".js");
	} catch(tryAsNodeModule) {
		SessionHandler = require(Configuration.session.handler);
	}
	var sessionHandler = new SessionHandler(Configuration.session);
	
	var server = express();
	server.use(cookieParser());
	server.use(bodyParser.json());
	server.use(bodyParser.urlencoded({ extended: false }));
	
//	server.use("/tower/auth", authentication);
	
	server.use(function(req, res, next) {
		res.setHeader("Content-Security-Policy", csp);
		log.debug({"req": req}, "Request Received");
		next();
	});
	
	server.post("/ping", function(req,res) {
		sovereign.ping(req.body);
		res.json({"status": 0, "message": "Pinged"});
	});
	
	server.get("/status", function(req,res) {
		res.json(sovereign.status());
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
	
	var options = {};
	options.server = opened;
	options.verifyClient = function(info, done) {
		var location = url.parse(info.req.url, true);
		info.req.query = location.query; // This doesn't appear to be handled by WS
		info.req.path = location.path;
		
		sessionHandler.getSession(info.req)
		.then(function(session) {
			if(session) {
				log.info({"req": info.req, "session": session}, "Websocket accepted");
				info.req.session = session;
				done(true);
			} else {
				log.warn({"req": info.req}, "Rejected websocket request for lack of session");
				done(false, 401, "Must be logged in with an active session");
			}
		}).catch(function(error) {
			log.error({"error": error, "stack": error.stack, "req": info.req}, "Failed to find session data for user while verifying websocket client: " + error.message);
			done(false, 500, "Failed to search for Session information: " + error.message);
		});
	};
	
	var socketserver = new WebSocket.Server(options);
	socketserver.on("connection", function(connection, req) {
		if(req.path === "/connect") { // Path & Session set by client verification
			connection.session = req.session;
			connection.host = req.ip;
			
			if(req.session) {
				connection.name = req.session.name;
			} else {
				connection.name = "no-session";
			}
			
			sovereign.client(connection);
		}
	});
	
	socketserver.on("error", function(error) {
		console.log("Socket Server Errored: ", error);
	});
	
	secure.on("error", onError(Configuration.server.https));
	secure.on("listening", onListening(Configuration.server.https));
	secure.listen(Configuration.server.https.port);

	opened.on("error", onError(Configuration.server.http));
	opened.on("listening", onListening(Configuration.server.http));
	opened.listen(Configuration.server.http.port);
	
	Structure.defineApp(server);
});





Object.prototype.clone = function() {
	return JSON.parse(JSON.stringify(this));
};
