
var Bunyan = require("bunyan");
var root = require("root-require")("package.json");
var defaults = {
	"name": root.name,
	"streams": [{
		"path": "./test.log",
		"level": "debug",
		"type": "rotating-file"
	}]
};
var id = 0;

module.exports.resolve = function(configuration) {
	return new Promise(function(done) {
		var reqSerializer = function(req) {
			if(req._serialized) {
				if(req.session) {
					return {
						rsid: req.rsid,
						session: req.session.id, /* "Coming Soon", currently the "Cookie" */
						instance: req.session.instance, /* "Coming Soon" */
						username: req.session.Username
					};
				} else {
					return{
						rsid: req.rsid,
						session: undefined,
						instance: undefined,
						username: undefined
					};
				}
			} else {
				var parse, body, query, params;
				req._serialized = true;
				req.rsid = req.rsid || (req.ip + "#" + id++);
				parse = JSON.stringify(req.body);
				body = parse.substring(0, 100);
				parse = JSON.stringify(req.query);
				query = parse.substring(0, 100);
				parse = JSON.stringify(req.params);
				params = parse.substring(0, 100);
				return {
					rsid: req.rsid,
					method: req.method,
					url: req.url,
					session: req.session,
					headers: req.headers,
					body: body,
					query: query,
					params: params
				};
			}
		};
		
		var responseSerializer = function(response) {
			if(response) {
				return {
					"header": response.headers,
					"body": response.body,
					"statusCode": response.statusCode
				};
			} else {
				return{};
			}
		};
		
		configuration.systemLog = Object.assign({}, defaults, configuration.systemLog);
		
		configuration.systemLog.serializers = {
			response: responseSerializer,
			request: reqSerializer,
			res: responseSerializer,
			req: reqSerializer
		};
		
		configuration.systemLog = new Bunyan(configuration.systemLog);
		done({
			"systemLog": configuration.systemLog
		});
	});
};
