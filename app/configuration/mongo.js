var mongo = require("mongodb");
var MongoClient = mongo.MongoClient;
var MongoServer = mongo.Server;
mongo.Promise = global.Promise;

module.exports.resolve = function(configuration) {
	return new Promise(function(done, fail) {
		setTimeout(function() {
			var url = configuration.mongo.url || ("mongodb://" + configuration.mongo.host + (configuration.mongo.port?":" + configuration.mongo.port:""));
			var finish = function(err, connection) {
				if(err) {
					fail(err);
				} else {
					var connected = {};
					connected.mongo = Object.assign({}, configuration.mongo);
					connected.mongo.connection = connection;
					var connections = {};
					if(connected.mongo.database) {
						console.log("Connected DB: " + connected.mongo.database);
						connections[connected.mongo.database] = connection.db(connected.mongo.database);
					}
					if(connected.mongo.databases) {
						connected.mongo.databases.forEach(function(db) {
							console.log("Connected DB: " + db);
							connections[db] = connection.db(db);
						});
					}
					connected.mongo.db = connections;

					console.log("Mongo connected");
					configuration.mongo = connected;
					done(connected);
				}
			};
			
			MongoClient.connect(url, finish);
		}, 0);
	});
};
