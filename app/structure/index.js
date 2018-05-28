
/**
 * This class handles generating documentation for REST requests.
 * 
 * This system assumes ASCII/UTF-8 encoding for detection of '*' and '/' characters.
 * 
 * @class Design
 * @module Documentation
 * @constructor
 * @static
 * @main
 */

/* Isolate Base Variables */
module.exports.package = require("root-require")("package.json");
module.exports.root = require("root.json");
var configuration = require("../config/");
var os = require("os");
var domain = configuration.host?configuration.host.domain:undefined;
var hostname = os.hostname() + (domain?"." + domain:"");

/* Model Files => definitions */
var glob = require("glob");
var fs = require("fs");

var modeled = new Promise(function(done, fail) {
	fs.readdir("./app/models/", function(err, paths) {
		if(err) {
			console.log("Model Load Error: ", err, paths);
			log.warn({"message": "Failed to build Model based definition reference: " + err.message, "stack": err.stack, "section": "swagger"});
		} else {
			paths.forEach(function(file) {
				promised.push(processModelFile(file));
			});
			Promise.all(promised)
			.then(done)
			.catch(fail);
		}
	});
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

		var stream = fs.createReadStream("./app/models/" + file);
		var finish = function(err) {
			if(done) {
				if(definition.name) {
					if(module.exports.schemas.appending[definition.name]) {
						if(module.exports.schemas.appending[definition.name].properties) {
							Object.keys(module.exports.schemas.appending[definition.name].properties).forEach(function(prop) {
								definition.schema.properties[prop] = definition.schema.properties[prop] || {};
								Object.assign(definition.schema.properties[prop], module.exports.schemas.appending[definition.name].properties[prop]);
							});
						}
						delete(module.exports.schemas.appending[definition.name].properties);
						delete(module.exports.schemas.appending[definition.name].name);
						Object.assign(definition.schema, module.exports.schemas.appending[definition.name]);
					}
					models.push(definition);
				}
				done();
				if(err) {
					log.warn({"message": "Failed to process model: " + err.message, "stack": err.stack, "section": "swagger"});
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

var getJIRAComponent = function(name) {
	if(module.exports.package.docsJiraName) {
		return module.exports.package.docsJiraName;
	}
	
	try {
		name = name.split("-");
		name[1] = name[1].replace(/([a-z])([A-Z])/g,"$1 $2");
		return name[0] + " - " + name[1];
	} catch(ignored) {
		return name.replace;
	}
};

var getJIRAComponentSearch = function(name) {
	name = getJIRAComponent(name);
	return "https://jira.it.ohio-state.edu/issues/?jql=project%3Dlsid%20and%20sprint%20in%20openSprints()%20and%20component%20%3D%20%22" + name.replace(/ /ig, "%20") + "%22%20";
};

module.exports.defineApp = function(app) {
	module.exports.application = application = app;
};

/**
 * 
 * @method formBase
 * @return {Promise}
 */
module.exports.formBase = function() {
	return new Promise(function(done) {
		var jira, base = {
			"swagger": "2.0",
			"info": {
				"title": module.exports.package.name,
				"description": module.exports.package.description,
				"version": module.exports.package.version,
				"termsOfService": "https://alpha.osu.edu/terms",
				"license": {
					"name": "Microservice Core V" + module.exports.package.microserviceCore.version,
					"url": "https://repo.it.ohio-state.edu/core-development/Microservice-Core/tags/" + module.exports.package.microserviceCore.version
				},
				"contact": {
					"email": "odee-lsi-developers@osu.edu"
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
				"name": "Alpha Code Documentation",
				"url": "http://alpha-docs.it.ohio-state.edu/part/" + (module.exports.package.docsAlphaName || module.exports.package.name) + "/docs/"
			}
		};

		base.info.description = base.info.description || "";
		jira = getJIRAComponentSearch(module.exports.package.name);
		base.info.description += "\n\n[JIRA Component](" + jira + ")";
		base.info.description += "\n\n[Repository](" + (module.exports.package.homepage || "https://repo.it.ohio-state.edu/odee-developers/" + (module.exports.package.docsAlphaName || module.exports.package.name)) + ")";
		
		if(configuration.listen) {
			base.schemes.push("http");
			base.host += ":" + configuration.listen;
		}

		if(configuration.secure) {
			base.schemes.push("https");
			base.host += ":" + configuration.secure.listen;
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

		models.forEach(function(model) {
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
					"name": "requestid",
					"description": "Identifier for the request",
					"default": "TestRequest#0",
					"type": "string"
				});
				parameters.push({
					"in": "header",
					"name": "x-alpha-session",
					"default": base.options.session || "{\"agent\":\"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36\",\"DisplayName\":\"Test User\",\"lastname\":\"User\",\"srcip\":\"0.0.0.0\",\"Username\":\"user.0\",\"appOrigin\":\"https://utopia.it.ohio-state.edu/\",\"appContext\":\"No Where\",\"discussion\":\"SomeDiscussionID\",\"EPPN\":\"10000000\",\"EMPLID\":\"10000000\",\"authInitiated\":\"1520427020977\",\"dateAuthorized\":\"1520427020978\",\"handler\":\"distopia01.it.ohio-state.edu\",\"firstname\":\"Test\",\"IDMID\":\"IDM000000000\",\"requestid\":\"FirstRequestID\",\"previous\":\"distopia01.it.ohio-state.edu\",\"type\":\"test\",\"currentip\":\"0.0.0.1\",\"permissions\":{\"routing\":false},\"loaded\":1520435689756}",
					"description": "JSON for the session, typically received from the MSB during routing",
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

				if(module.exports.service.swagger.paths[path]) {
					if(module.exports.service.swagger.paths[path].delete) {
						// For removing badly generated paths, should be rare
						delete(base.paths[path]);
					} else {
						Object.keys(module.exports.service.swagger.paths[path]).forEach(function(method) {
							if(method === "*") {
								Object.keys(base.paths[path]).forEach(function(k) {
									Object.assign(base.paths[path][k], module.exports.service.swagger.paths[path][method]);
								});
							} else {
								base.paths[path][method] = base.paths[path][method] || {};
								Object.assign(base.paths[path][method], module.exports.service.swagger.paths[path][method]);
							}
							if(module.exports.service.swagger.paths[path][method].parameters) {
								base.paths[path][method].parameters = index.parameters.concat(module.exports.service.swagger.paths[path][method].parameters);
							}
						});
					}
				}
				if(module.exports.core.paths[path]) {
					if(module.exports.core.paths[path].delete) {
						// For removing badly generated paths, should be rare
						delete(base.paths[path]);
					} else {
						Object.keys(module.exports.core.paths[path]).forEach(function(method) {
							if(method === "*") {
								Object.keys(base.paths[path]).forEach(function(k) {
									Object.assign(base.paths[path][k], module.exports.core.paths[path][method]);
								});
							} else {
								base.paths[path][method] = base.paths[path][method] || {};
								Object.assign(base.paths[path][method], module.exports.core.paths[path][method]);
							}
							if(module.exports.service.swagger.paths[path]) {
								if(module.exports.service.swagger.paths[path][method].parameters) {
									base.paths[path][method].parameters = index.parameters.concat(module.exports.service.swagger.paths[path][method].parameters);
								}
								if(module.exports.service.swagger.paths[path][method].responses) {
									Object.assign(base.paths[path][method].responses, index.responses, module.exports.service.swagger.paths[path][method].responses);
								}
							}
						});
					}
				}
			}
			return path;
		};

		application._router.stack.forEach(function(router) {
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

modeled
.then(complete)
.catch(failure);
