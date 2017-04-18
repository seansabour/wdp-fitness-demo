var request = require("request");
var async = require("async");
var sleep = require('sleep');

const userdb = require("./user-db");

var CLIENT_ID = "hrjfvqafh9s3phqfk9btp3exr3yg2apf";
var CLIENT_SECRET = "vzBVAX9knJCFGRu8yx65q24e7dt8dS88vZCXCStJKrB";

exports.processData = function(user, cb) {
    getData(user, function(data) {
        var name = user.doc.name;
        var au_id = user.doc.au_id;
        var isSteps = user.doc.steps;
        var isMass = user.doc.weight;

        var aggregates = data.aggregates;
        for(var i in aggregates) {
            var one = aggregates[i];
            var name = data.name;
            var au_id = data.au_id;
            var type = one._links.data_type[0].id;
            var periods = one.periods;
            if(type == "steps_summary" && isSteps == "yes") {
                console.log("processing steps");
                processSteps(name, au_id, periods, function() {
                    console.log("Processed steps");
                });
            } else if(type == "body_mass_summary" && isMass == "yes") {
                console.log("processing mass");
                processMass(name, au_id, periods, function() {
                    console.log("Processed mass");
                });
            }
        }
    });
}

function getData(user, cb) {
    var name = user.doc.name;
    var au_id = user.doc.au_id;
    var now = new Date();
    var headers = {
        'Authorization':       'Bearer ' + user.doc.access_token,
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
            var embedded = body._embedded;
            embedded.name = name;
            embedded.au_id = au_id;
            cb(embedded);
        } else {
            cb({error: null});
        }
    });
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
            console.log('Some mass values failed to process');
        } else {
            cb();
            console.log('All masses processed successfully');
        }
    });
}