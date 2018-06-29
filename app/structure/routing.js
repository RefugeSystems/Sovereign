
var express = require("express");
var structure = require("./index");
module.exports = express.Router();

var success= function(res) {
	return function(result) {
		res.json(result);
	};
};

module.exports.get("/", function(req, res, next) {
	if(req.query.search) {
		req.body = req.body || {};
		try {
			req.body.paths = JSON.parse(req.query.search);
		} catch(exception) {
			req.body.paths = req.query.search.split(",");
		}
	}
	
	structure.modeled
	.then(structure.formBase)
	.then(structure.addOptions(req.query))
	.then(structure.getDefinitions)
	.then(structure.getPaths)
	.then(structure.getDiscrete(req.params.path || req.body.paths))
	.then(success(res))
	.catch(next);
});

module.exports.get("/base", function(req, res, next) {
	structure.ready
	.then(structure.formBase)
	.then(success(res))
	.catch(next);
});

module.exports.get("/definitions", function(req, res, next) {
	structure.ready
	.then(structure.getDefinitions)
	.then(success(res))
	.catch(next);
});

module.exports.get("/routes", function(req, res, next) {
	structure.ready
	.then(structure.getPaths)
	.then(success(res))
	.catch(next);
});

module.exports.get("/generate", function(req, res, next) {
	next(new Error("Not yet implemented"));
});
