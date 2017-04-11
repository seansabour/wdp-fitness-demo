var request = require("request");
var async = require("async");
var sleep = require('sleep');

const userdb = require("./user-db");

var CLIENT_ID = "hrjfvqafh9s3phqfk9btp3exr3yg2apf"
var CLIENT_SECRET = "vzBVAX9knJCFGRu8yx65q24e7dt8dS88vZCXCStJKrB"

exports.processData = function() {
    getAggregates(function(data) {
        for(var i in data) {
            var both = data[i];
            var name = both.name;
            var au_id = both.au_id;
            for (j = 0; j < both.length; j++) {
                var one = both[j];
                var type = one._links.data_type[0].id;
                var periods = one.periods;
                if(type == 'steps_summary') {
                    processSteps(name, au_id, periods, function() {
                        console.log("Processed steps");
                    });
                } else if(type == 'body_mass_summary') {
                    processMass(name, au_id, periods, function() {
                        console.log("Processed mass");
                    });
                }
            }
        }
    });
}

function getAggregates(cb) {
	userdb.getAllUsers(function(rows) {
		var data = [];
        getData(rows, data, 0, function(data) {
            cb(data);
        });
	});
}

function getData(rows, data, r, cb){
    if( r < rows.length ) {
        var name = rows[r].doc.name;
        var au_id = rows[r].doc.au_id
        var now = new Date();
        var headers = {
            'Authorization':       'Bearer ' + rows[r].doc.access_token,
            'Api-Key': CLIENT_ID,
            'Content-Type':     'application/json'
        }
        var options = {
            url: 'https://api.ua.com/v7.1/aggregate/',
            method: 'GET',
            headers: headers,
            qs: {
                data_types: 'steps_summary,body_mass_summary',
                period: 'P1D',
                start_datetime: 2017 + '-' + 3 + '-' + 17,
                end_datetime: now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate(),
                user_id: au_id
            }
        }
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var body = JSON.parse(body);
                var aggregates = body._embedded.aggregates;
                aggregates.name = name;
                aggregates.au_id = au_id;
                data.push(aggregates);
            } else {
                data.push({error: null});
            }
            getData(rows, data, r+1, cb);
        })
    } else {
        cb(data);
    }
}

function processSteps(name, user_id, periods, cb) {
    async.each(periods, function(p, callback) {
        var date = p.user_date;
        var steps = p.value.steps_sum;
        var id = date + "-" + name;
        var activity = {
            _id: id,
            steps: parseInt(steps),
            name: name,
            au_id: user_id,
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
            console.log('Some steps failed to process');
        } else {
            cb();
            console.log('All steps processed successfully');
        }
    });
}

function processMass(name, user_id, periods, cb) {
    async.each(periods, function(p, callback) {
        var date = p.user_date;
        var mass = p.value.mass_avg;
        if(mass == null)
            mass = -1
        var id = date + "-" + name;
        var activity = {
            _id: id,
            body_mass: parseFloat(mass),
            name: name,
            au_id: user_id,
            date: date
        }
        userdb.getMass(id, function(obj_mass) {
            if(obj_mass != null) {
                var old_mass = obj_mass.body_mass;
                var new_mass = activity.body_mass;
                if(new_mass < old_mass) {
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
            console.log('Some mass values failed to process');
        } else {
            cb();
            console.log('All masses processed successfully');
        }
    });
}


// processData()
