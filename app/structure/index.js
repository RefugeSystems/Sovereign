
/**
 * This class handles generating documentation for REST requests.
 * 
 * This system assumes ASCII/UTF-8 encoding for detection of '*' and '/' characters.
 * 
 * @class Structure
 * @module Documentation
 * @constructor
 * @static
 * @main
 */
module.exports.package = require("root-require")("package.json");
module.exports.root = require("./root.json");
var configuration = require("a-configuration");
var os = require("os");
var domain = configuration.host?configuration.host.domain:undefined;
var hostname = os.hostname() + (domain?"." + domain:"");

var glob = require("glob");
var fs = require("fs");
var log = configuration.systemLog;

var complete, failure;
module.exports.models = [];
module.exports.application = null;
module.exports.modeled = new Promise(function(done, fail) {
	complete = done;
	failure = fail;
});

var processModelFile = function(file) {
	return new Promise(function(done) {
		var definition = {
			"name": false,
			"schema": {
				"type": "object",
				"properties": {}
			}
		};

		console.log("Read File: " + file);
//		var stream = fs.createReadStream("./app/models/" + file);
		var stream = fs.createReadStream(file);
		var finish = function(err) {
			if(done) {
				if(definition.name) {
					if(module.exports.root.appending[definition.name]) {
						if(module.exports.root.appending[definition.name].properties) {
							Object.keys(module.exports.root.appending[definition.name].properties).forEach(function(prop) {
								definition.schema.properties[prop] = definition.schema.properties[prop] || {};
								Object.assign(definition.schema.properties[prop], module.exports.root.appending[definition.name].properties[prop]);
							});
						}
						delete(module.exports.root.appending[definition.name].properties);
						delete(module.exports.root.appending[definition.name].name);
						Object.assign(definition.schema, module.exports.root.appending[definition.name]);
					}
					module.exports.models.push(definition);
				}
				done();
				if(err) {
					log.warn({"message": "Failed to process model: " + err.message, "stack": err.stack, "section": "swagger", "file": file});
				}
				done = false;
			}
		};

		stream.on("close", finish);
		stream.on("error", finish);
		stream.on("end", finish);

		var x, index, name, type, description, building = [], state = 0, close = 0;
		var parse = function(text) {
			// TODO: Parse out additional Tags: @usage [Think Transaction Queue vs Service], @since [ Thing Version, like V2.4], @deprecated, @beta [Think "this is in development"]
			if( (index = text.indexOf("@class")) !== -1) {
				definition.schema.description = text.substring(0, text.indexOf("@")).trim();
				definition.name = text.substring(index+7, text.indexOf("\n", index)).trim();
			} else if( (index = text.indexOf("@property")) !== -1) {
				description = text.substring(0, text.indexOf("@")).trim();
				name = text.substring(index+10, text.indexOf("\n", index)).trim();
				index = text.indexOf("@type");
				if(index !== -1) {
					type = text.substring(index+6, text.indexOf("\n", index)).trim().toLowerCase();
					switch(type) {
						case "date":
							type = "number";
							break;
						case "objectid":
							type = "string";
							break;
						default:
							index = type.lastIndexOf("|");
							if(index === -1) {
								type = "object";
							} else {
								type = type.substring(index+1).trim();
							}
						case "string":
						case "array":
						case "number":
						case "boolean":
						case "integer":
						case "object":
						case "null":
					}

					switch(type) {
						default:
							type = "object";
							break;
						case "array":
						case "string":
						case "number":
						case "boolean":
						case "integer":
						case "object":
						case "null":
					}
				}
				definition.schema.properties[name] = {
					"description": description,
					"type": type
				};
				if(type === "array") {
					definition.schema.properties[name].items = {
						"type": "object"
					};
				}
			}
		};
		stream.on("data", function(chunk) {
			for(x=0; x<chunk.length; x++) {
				switch(chunk[x]) {
					case 47:
//						console.log("Chunk[" + file + "] - Slash @" + x);
						if(state === 0) {
							state = 1;
							close = 0;
						}
						if(close === 1) {
							parse(new String(Buffer.from(building)));
							building = [];
							state = 0;
							close = 0;
						}
						break;
					case 42:
//						console.log("Chunk[" + file + "] - Denotion @" + x);
						if(close === 1 || close === 0) {
							close += 1;
						}
						if(state === 1 || state === 2) {
							state += 1;
						}
						break;
					default:
						close = 0;
				};
				if(state === 3) {
					switch(chunk[x]) {
						case 13: // '\r'
						case 9:  // '\t'
						case 42: // '*'
							break;
						case 20: // ' '
							building.push(" ");
							break;
						case 10: // '\n'
						default:
							building.push(chunk[x]);
					}
				}
			}
		});
	});
};

module.exports.defineApp = function(app) {
	module.exports.application = app;
	var promised = [];
//	fs.readdir("./app/models/", function(err, paths) {
	glob("./app/**/*.js", function(err, paths) {
		if(err) {
			console.log("Model Load Error: ", err, paths);
			log.warn({"message": "Failed to build Model based definition reference: " + err.message, "stack": err.stack, "section": "swagger"});
		} else {
			paths.forEach(function(file) {
				promised.push(processModelFile(file));
			});
			Promise.all(promised)
			.then(complete)
			.catch(failure);
		}
	});
};

/**
 * 
 * @method formBase
 * @return {Promise}
 */
module.exports.formBase = function() {
	return new Promise(function(done) {
		var base = {
			"swagger": "2.0",
			"info": {
				"title": module.exports.package.name,
				"description": module.exports.package.description,
				"version": module.exports.package.version,
				"termsOfService": "https://refugesystems.net/sovereign/terms",
				"contact": {
					"email": "administrator@refugesystems.net"
				}
			},
			"host": hostname,
			"basePath": "/",
			"tags": [],
			"schemes": [],
			"paths": {},
			"securityDefinitions": {},
			"options": {},
			"definitions": {},
			"externalDocs": {
				"name": "Sovereign",
				"url": "https://refugesystems.net/sovereign/docs"
			}
		};
		
		if(configuration.server.http) {
			base.schemes.push("http");
			base.host += ":" + configuration.server.http.port;
		}

		if(configuration.server.https) {
			base.schemes.push("https");
			base.host += ":" + configuration.server.https.port;
		}

		done(base);
	});
};

/**
 * 
 * @method getDefinitions
 * @return {Promise}
 */
module.exports.getDefinitions = function(base) {
	return new Promise(function(done) {
		base = base || {};
		base.definitions = base.definitions || {};

		module.exports.models.forEach(function(model) {
			base.definitions[model.name] = model.schema;
		});

		done(base);
	});
};

/**
 * Leverages the Express Application defined with "defineApp" to generate base route information
 * passed on defined paths. Support for properties such as parameters and regex inside the route
 * are pending (If determined to be needed).
 * @method getPaths
 * @return {Promise}
 */
module.exports.getPaths = function(base) {
	return new Promise(function(done) {
		base = base || {};
		base.paths = base.paths || {};

		var buildPath = function(path, router) {
			path += cleanRouteRegex(router);
			if(router.name === "router") {
				router.handle.stack.forEach(function(building) {
					buildPath(path, building);
				});
			} else if(router.name === "bound dispatch") {
				var name, hunt, replace, index, trim, parameters = [];
				while( (index = path.indexOf(":")) !== -1) {
					trim = path.indexOf("/", index);
					if(trim === -1) {
						hunt = path.substring(index);
					} else {
						hunt = path.substring(index, trim);
					}
					name = hunt.substring(1);
					replace = "{" + name + "}";
					path = path.replace(hunt, replace);
					parameters.push({
						"name": name,
						"in": "path",
						"required": true,
						"type": "string"
					});
				}

				parameters.push({
					"in": "header",
					"name": "rsid",
					"description": "Identifier for the request",
					"default": undefined,
					"type": "string"
				});

				base.paths[path] = base.paths[path] || {};
				index = {
					"produces": ["application/json"],
					"parameters": parameters,
					"consumes": ["application/json"],
					"responses": {
						"405": {
							"description": "Invalid input"
						},
						"500": {
							"description": "Exception encountered while processing request"
						}
					}
				};

				Object.keys(router.route.methods).forEach(function(method) {
					if(method === "_all") {
						method = "post"; // Simplification of the route
					}
					base.paths[path][method] = base.paths[path][method] || {};
					Object.assign(base.paths[path][method], index);
				});
				if(module.exports.root.paths[path]) {
					if(module.exports.root.paths[path].delete) {
						// For removing badly generated paths, should be rare
						delete(base.paths[path]);
					} else {
						Object.keys(module.exports.root.paths[path]).forEach(function(method) {
							if(method === "*") {
								Object.keys(base.paths[path]).forEach(function(k) {
									Object.assign(base.paths[path][k], module.exports.root.paths[path][method]);
								});
							} else {
								base.paths[path][method] = base.paths[path][method] || {};
								Object.assign(base.paths[path][method], module.exports.root.paths[path][method]);
							}
							if(module.exports.root.swagger.paths[path]) {
								if(module.exports.root.swagger.paths[path][method].parameters) {
									base.paths[path][method].parameters = index.parameters.concat(module.exports.root.swagger.paths[path][method].parameters);
								}
								if(module.exports.root.swagger.paths[path][method].responses) {
									Object.assign(base.paths[path][method].responses, index.responses, module.exports.root.swagger.paths[path][method].responses);
								}
							}
						});
					}
				}
			}
			return path;
		};

		module.exports.application._router.stack.forEach(function(router) {
			buildPath("", router);
		});

		done(base);
	});
};

module.exports.addOptions = function(options) {
	return function(base) {
		return new Promise(function(done) {
			Object.assign(base.options, options);
			done(base);
		});
	};
};

/**
 * 
 * @method getDiscrete
 * @param {Array | String} paths
 * @return {Promise}\
 */
module.exports.getDiscrete = function(paths) {
	var x;
	
	if(paths instanceof Array) {
		for(x=0; x<paths.length; x++) {
			paths[x] = new RegExp("^/?" + paths[x].trim(), "i");
		}
	} else {
		paths = paths?[new RegExp("^/?" + paths.trim(), "i")]:[];
	}
	
	return function(base) {
		return new Promise(function(done) {
			if(base.paths && paths.length) {
				Object.keys(base.paths).forEach(function(path) {
					for(x=0; x<paths.length; x++) {
						if(paths[x].test(path)) {
							return true;
						}
					}
					delete(base.paths[path]);
				});
			}
			done(base);
		});
	};
};

var cleanRouteRegex = function(object) {
	var path = "";
	if(object.name === "router") {
		path = object.regexp.source.replace(/[\^\\\?=\$\|\(\)]/g, "");
		path = path.substring(0, path.length-2);
	} else if(object.name === "bound dispatch") {
		path = object.route.path;
	}
	return path;
};
