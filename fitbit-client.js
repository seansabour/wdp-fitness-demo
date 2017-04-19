var request = require("request");
var async = require("async");
var sleep = require('sleep');

const userdb = require("./user-db");


function getSteps(user_id, access_token, cb) {
    var now = new Date();
    var date = now.getFullYear() + '-0' + (now.getMonth() + 1) + '-' + now.getDate()
    var headers = {
        "Authorization": "Bearer "+ access_token
    };

    // Configure the request
    var options = {
        url: "https://api.fitbit.com/1/user/"+user_id+"/activities/steps/date/2017-04-01/"+date+".json",
        headers: headers,
    };

    console.log("options: " + JSON.stringify(options));
                
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            var body = JSON.parse(body);
            cb(body["activities-steps"]);
        } else {
            console.log("Error for getting fitbit steps");
            console.log(error);
        }
    });
}

function getMass(user_id, access_token, cb) {
    var now = new Date();
    var date = now.getFullYear() + '-0' + (now.getMonth() + 1) + '-' + now.getDate()
    var headers = {
        "Authorization": "Bearer "+ access_token,
    };

    // Configure the request
    var options = {
        url: "https://api.fitbit.com/1/user/"+user_id+"/body/log/weight/date/2017-04-01/"+date+".json",
        headers: headers,
    };

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            cb(body.weight);
        } else {
            console.log("Error for getting fitbit mass");
            console.log(error);
        }
    });
}

function processSteps(name, user_id, periods, cb) {
    async.each(periods, function(p, callback) {
        var date = p.dateTime;
        var steps = p.value;
        var id = date + "-" + name;
        var activity = {
            _id: id,
            steps: parseInt(steps),
            name: name,
            fitbit_id: user_id,
            date: date
        }
        userdb.getSteps(id, function(obj_steps) {
            if(obj_steps != null) {
                var old_steps = obj_steps.steps;
                var new_steps = activity.steps;
                console.log("Found an entry old: " + old_steps + " and new steps: " + new_steps);
                if(new_steps > old_steps) {
                    obj_steps.steps = new_steps;
                    console.log("Inserting because updated steps");
                    userdb.insertSteps(obj_steps, function() {
                        callback();
                    });
                }
            } else {
                console.log("insertion because new steps");
                userdb.insertSteps(activity, function() {
                    callback();
                });
            }
        });
    }, function(err) {
        if( err ) {
            console.log('Some fitbit steps failed to process');
        } else {
            cb();
            console.log('All fitbit steps processed successfully');
        }
    });
}

function processMass(name, user_id, periods, cb) {
    async.each(periods, function(p, callback) {
        var date = p.date;
        var mass = p.weight;
        if(mass == null)
            mass = -1
        var id = date + "-" + name;
        var activity = {
            _id: id,
            body_mass: parseFloat(mass),
            name: name,
            fitbit_id: user_id,
            date: date
        }
        userdb.getMass(id, function(obj_mass) {
            if(obj_mass != null) {
                var old_mass = obj_mass.body_mass;
                var new_mass = activity.body_mass;
                if(new_mass != old_mass) {
                    obj_mass.body_mass = new_mass;
                    userdb.insertMass(obj_mass, function() {
                        callback();
                    });
                }
            } else {
                userdb.insertMass(activity, function() {
                    callback();
                });
            }
        });

    }, function(err) {
        if( err ) {
            console.log('Some fitbit mass values failed to process');
        } else {
            cb();
            console.log('All fitbit masses processed successfully');
        }
    });
}

exports.processData = function(user, cb) {
    var name = user.doc.name;
    var fitbit_id = user.doc.au_id;
    var access_token = user.doc.access_token;
    var isSteps = user.doc.steps;
    var isMass = user.doc.weight;
    console.log("Name: " + name);

    async.parallel([
        function(callback) {
            if(isSteps == "yes") {
                getSteps(fitbit_id, access_token, function(steps) {
                    processSteps(name, fitbit_id, steps, function() {
                        console.log("Fitbit: processed steps");
                    });
                });
            }
        },
        function(callback) {
            if(isMass == "yes") {
                getMass(fitbit_id, access_token, function(mass) {
                    processMass(name, fitbit_id, mass, function() {
                        console.log("Fitbit: processed mass");
                    });
                });
            }
        }
    ],
    // optional callback
    function(err, results) {
        // the results array will equal ['one','two'] even though
        // the second function had a shorter timeout.
        cb();
    });
}

