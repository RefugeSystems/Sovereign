module.exports = function(grunt) {

	require("load-grunt-tasks")(grunt);

	grunt.loadNpmTasks("grunt-karma");
	grunt.loadNpmTasks("gruntify-eslint");
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-connect");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("grunt-contrib-yuidoc");
	
	var config = {
		"pkg":  grunt.file.readJSON("package.json"),
		"eslint":  {
			"options":  {
				"ecmaFeatures":  {
					"modules":  true
				},
				"ignorePath":  ".eslintignore",
				/* http://eslint.org/docs/rules/ */
				"globals":  [
					"sessionStorage",
					"localStorage",
					"_gazeVersion",
					"FileReader",
					"cytoscape",
					"location",
					"document",
					"angular",
					"Promise",
					"global",
					"window",
					"inject",
					"module",
					"Gaze",
					"cola",
					"atob",
					"btoa",
					"Vue",
					"d3",
					"$"
				],
				"rules":  {
					"eqeqeq":  0,
					"curly":  2,
					"quotes":  [2, "double"],
					"block-scoped-var": 2,
					"no-undef": 2,
					"semi": 2,
					"no-unused-vars": 1
				},
				"terminateOnCallback": false,
				"callback": function(response) {
					if(response.errorCount) {
						var result, message;
						for(result=response.results.length-1; result !== -1; --result) {
							if(!response.results[result].errorCount) {
								response.results.splice(result,1);
							} else {
								for(message=response.results[result].messages.length-1; message !== -1; --message) {
									if(response.results[result].messages[message].severity !== 2) {
										response.results[result].messages.splice(message,1);
									}
								}
							}
						}
					}
					return response;
				},
				"envs":  ["browser", "node", "jasmine"]
			},
			"app":  ["client/**/*.js",
			         "spec/**/*.js",
			         "app/**/*.js"]
		},
		"concat":  {
			"clientjs":  {
				"src":  ["node_modules/angular/angular.js",
				      "node_modules/jquery/dist/jquery.js",
				      "node_modules/angular-route/angular-route.js",
				      "node_modules/angular-utils-pagination/dirPagination.js",
				      "node_modules/cytoscape/dist/cytoscape.js",
				      "node_modules/cytoscape-cola/cola.js",
				      "node_modules/cytoscape-cola/cytoscape-cola.js",
				      "client/library/*.js",
				      "client/scripts/modules/*.js",
				      "client/scripts/configuration/*.js",
				      "client/scripts/configuration/*.js",
				      "client/scripts/providers/*.js",
				      "client/scripts/filters/*.js",
				      "client/scripts/factory/*.js",
				      "client/scripts/directives/*.js",
				      "client/scripts/controllers/*.js",
				      "client/scripts/services/*.js"],
				"dest":  "client/lcars.js"
			},
			"clientcs":  {
				"src":  ["client/styles/*.css",
					"client/styles/**/*.css"],
				"dest":  "client/lcars.css"
			}
		},
		"connect":  {
			"server":  {
				"options":  {
					"port":  3080,
					"base":  "client/",
					//hostname: "localhost",	// Allow only from localhost
					"hostname":  "*",				// Allow from anywhere
					"livereload":  3081,
					"middleware":  function(connect, options, middlewares) {
	                    middlewares.unshift(function(req, res, next) {
	                        res.setHeader("Access-Control-Allow-Origin", "*");
	                        res.setHeader("Content-Security-Policy",
	                        		"default-src " +
		                        		"'self' " +
		                        		"ws://127.0.0.1:3081/livereload " +
		                        		"ws://192.168.13.40:3081 " +
		                        		"ws://192.168.13.40:3081/livereload " +
		                        		"ws://localhost:3081  " +
		                        		"http://127.0.0.1:3081 " +
		                        		"http://localhost:3081 " +
		                        		"http://192.168.13.40:3081 " +
		                        		"wss://tower.refugesystems.net:3000 " +
		                        		"http://d3js.org " +
		                        		"'unsafe-inline' " +
		                        		"'unsafe-eval'; " +
	                        		"media-src " +
		                        		"'self' " +
		                        		"http://localhost:3081 " +
		                        		"blob: " +
		                        		"data:; " +
		                        	"script-src " +
		                        		"'self' " +
		                        		"http://127.0.0.1:3081 " +
		                        		"http://localhost:3081 " +
		                        		"http://192.168.13.40:3081 " +
		                        		"http://192.168.13.40:3081/livereload " +
		                        		"http://192.168.13.40:3081/livereload.js " +
		                        		"'unsafe-inline' " +
		                        		"'unsafe-eval' " +
		                        		"blob: " +
		                        		"data: " +
	                        		";");
	                        next();
	                    });
	                    return middlewares;
	                }
				}
			},
			"docs":  {
				"options":  {
					"port":  3090,
					"base":  "docs/",
					"hostname":  "localhost"
				}
			}
		},
		"templify":  {
			"testing":  {
				"templates":  [{
					"path":  "client/templates/",
					"rewrite":  function(path) {
						return path.substring(path.lastIndexOf("/") + 1);
					}
				}],
				"suffixes":  [".html"],
				"mode":  "karma-angular",
				"output":  "../../client/templates.js"
			}
		},
		"open ":  {
			"client ":  {
				"path":  "http://127.0.0.1:3080/"
			},
			"docs ":  {
				"path":  "http://127.0.0.1:3090/"
			},
			"karma":  {
				"path":  "http://127.0.0.1:5060/"
			}
		},
		"ngAnnotate":  {
			"options":  {
				"singleQuotes":  false,
			},
			"client":  {
				"files":  {
					"client/lcars.js": ["client/lcars.js"]
				}
			}
		},
		"watch":  {
			"client":  {
				"options":  {
					"livereload":  {
						"host":  "0.0.0.0",
						"port":  3081
					},
					"livereloadOnError":  false
				},
				"files":  ["client/scripts/**/*.js", "client/styles/**/*.css", "client/**/*.html", "client/*.html"],
				"tasks":  ["dev"]
			},
			"unit-tests": {
				
			},
			"lint":  {
				"files":  ["app/**/*.js", "client/**/*.js"],
				"tasks":  ["eslint:app","yuidoc"]
			}
		},
		"uglify":  {
			"client":  {
				"files":  {
					"./client/lcars.js": ["./client/lcars.js"]
				}
			}
		},
		"karma":  {
			"options":  {
				"frameworks":  ["jasmine"],
				"singleRun":  true,
				"junitReporter":  {
					"outputDir":  "./reports/jasmine", // results will be saved as $outputDir/$browserName.xml
					"outputFile":  undefined, // if included, results will be saved as $outputDir/$browserName/$outputFile
					"suite":  "", // suite will become the package name attribute in xml testsuite element
					"useBrowserName":  true, // add browser name to report and classes names
					"nameFormatter":  undefined, // function (browser, result) to customize the name attribute in xml testcase element
					"classNameFormatter":  undefined, // function (browser, result) to customize the classname attribute in xml testcase element
					"properties":  {} // key value pair of properties to add to the <properties> section of the report
				},
				"specReporter":  {
					"maxLogLines":  1,         // limit number of lines logged per test 
					"suppressErrorSummary":  true,  // do not print error summary 
					"suppressFailed":  false,  // do not print information about failed tests 
					"suppressPassed":  false,  // do not print information about passed tests 
					"suppressSkipped":  true,  // do not print information about skipped tests 
					"showSpecTiming":  false // print the time elapsed for each spec 
				},
				/*logLevel: "debug",*/
				"files":  ["node_modules/angular/angular.js",
	        			"node_modules/angular-mocks/angular-mocks.js",
					    "node_modules/jquery/dist/jquery.min.js",
	        			"suites/support/*.js",
	    				"scenarios/data/*.js",
						"client/templates.js",
						"client/scripts/modules/*.js",
						"client/scripts/configuration/*.js",
						"client/scripts/controllers/*.js",
						"client/scripts/directives/*.js",
						"client/scripts/providers/*.js",
						"client/scripts/services/*.js",
						"client/scripts/filters/*.js",
						"suites/unit/*.js"]
			},
			"unit":  {
				/*
				"files":  ["node_modules/angular/angular.min.js",
					    "node_modules/jquery/dist/jquery.min.js",
						"client/templates.js",
						"client/lcars.js",
						"node_modules/angular-mocks/angular-mock.js",
						"suites/unit/*.js"],
						*/
				"singleRun":  true,
				"browsers":  ["PhantomJS", "Chrome"],
				"htmlReporter":  {
					"outputFile":  "./reports/general.html"
				},
				"htmlLiveReporter":  {
					"colorScheme":  "jasmine", // light 'jasmine' or dark 'earthborn' scheme
					"defaultTab":  "summary", // 'summary' or 'failures': a tab to start with
					// only show one suite and fail log at a time, with keyboard navigation
					"focusMode":  true,
				}
			},
			"integration":  {
				/*
				"files":  ["node_modules/angular/angular.min.js",
					    "node_modules/jquery/dist/jquery.min.js",
						"client/templates.js",
						"client/lcars.js",
						"node_modules/angular-mocks/angular-mock.js",
						"suites/integration/*.js"],
						*/
				"singleRun":  true,
				"reporters":  ["spec", "junit", "live-html"],
				"browsers":  ["PhantomJS", "Chrome"],
				"htmlReporter":  {
					"outputFile":  "./reports/general.html"
				},
				"htmlLiveReporter":  {
					"colorScheme":  "jasmine", // light 'jasmine' or dark 'earthborn' scheme
					"defaultTab":  "summary", // 'summary' or 'failures': a tab to start with
					// only show one suite and fail log at a time, with keyboard navigation
					"focusMode":  true,
				}
			},
			"functional":  {
				/*
				"files":  ["node_modules/angular/angular.min.js",
					    "node_modules/jquery/dist/jquery.min.js",
						"client/templates.js",
						"client/lcars.js",
						"node_modules/angular-mocks/angular-mock.js",
						"suites/functional/*.js"],
						*/
				"singleRun":  true,
				"reporters":  ["spec", "junit", "live-html"],
				"browsers":  ["PhantomJS", "Chrome"],
				"htmlReporter":  {
					"outputFile":  "./reports/general.html"
				},
				"htmlLiveReporter":  {
					"colorScheme":  "jasmine", // light 'jasmine' or dark 'earthborn' scheme
					"defaultTab":  "summary", // 'summary' or 'failures': a tab to start with
					// only show one suite and fail log at a time, with keyboard navigation
					"focusMode":  true,
				}
			},
			"continuous":  {
				/*
				"files":  ["node_modules/angular/angular.min.js",
					    "node_modules/jquery/dist/jquery.min.js",
						"client/templates.js",
						"client/lcars.js",
						"node_modules/angular-mocks/angular-mock.js",
						"suites/unit/*.js"],
						*/
				"singleRun":  false,
				"reporters":  ["spec", "junit", "live-html"],
				"browsers":  ["PhantomJS", "Chrome"],
				"htmlReporter":  {
					"outputFile":  "./reports/general.html"
				},
				"htmlLiveReporter":  {
					"colorScheme":  "jasmine", // light 'jasmine' or dark 'earthborn' scheme
					"defaultTab":  "summary", // 'summary' or 'failures': a tab to start with
					// only show one suite and fail log at a time, with keyboard navigation
					"focusMode":  true,
				}
			},
			"deployment":  {
				"reporters":  ["spec", "junit"],
				"browsers":  ["PhantomJS"],
				"singleRun":  true,
				"htmlReporter":  null,
				"htmlLiveReporter":  null
			}
		},
		"yuidoc":  {
			"compile":  {
				"name":  "<%= pkg.name %>",
				"description":  "<%= pkg.description %>",
				"version":  "<%= pkg.version %>",
				"url":  "<%= pkg.homepage %>",
				"options":  {
					"paths":  ["./client", "./app"],
					"outdir":  "./docs",
					"exclude":  "**/angular.js, **/jquery.js",
					"markdown":  true
				}
			}
		},
		"concurrent":  {
			"development":  {
				"tasks":  [
						/*Docs*/ ["document"],
						/*Test*/ ["testing"],
						/*Run */ ["general"],
				],
				"options":  {
					"logConcurrentOutput":  true
				}
			}
        }
	};

	grunt.initConfig(config);
	
	grunt.registerTask("lint", ["eslint:app", "watch:lint"]);
	
	grunt.registerTask("default", ["lint", "watch"]);

	grunt.registerTask("test", ["lint"]);
};
