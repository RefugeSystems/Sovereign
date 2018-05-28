
var design = require("./index");

var success= function(req, next) {
	return function(result) {
		req.result = result;
		next();
	};
};

module.exports.general = function(req, res, next) {
	if(req.query.search) {
		req.body = req.body || {};
		try {
			req.body.paths = JSON.parse(req.query.search);
		} catch(exception) {
			req.body.paths = req.query.search.split(",");
		}
	}
	
	design.ready
	.then(design.formBase)
	.then(design.addOptions(req.query))
	.then(design.getDefinitions)
	.then(design.getPaths)
	.then(design.getDiscrete(req.params.path || req.body.paths))
	.then(success(req, next))
	.catch(next);
};

module.exports.base = function(req, res, next) {
	design.ready
	.then(design.formBase)
	.then(success(req, next))
	.catch(next);
};

module.exports.definitions = function(req, res, next) {
	design.ready
	.then(design.getDefinitions)
	.then(success(req, next))
	.catch(next);
};

module.exports.routes = function(req, res, next) {
	design.ready
	.then(design.getPaths)
	.then(success(req, next))
	.catch(next);
};

module.exports.generate = function(req, res, next) {
	next(new Error("Not yet implemented"));
};
