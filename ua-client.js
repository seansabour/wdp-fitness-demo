var request = require('request');
var async = require('async');
const userdb = require('./user-db');

var CLIENT_ID = 'jqycww2bzcutxt736abm7h3kf8xrdjqh'
var CLIENT_SECRET = 'PYZY48Xkn5xfPYJfKt3jr3p4hJzdyTZs9wPDcH8bcKp'

exports.getAggregates = function() {
	userdb.getAllUsers(function(rows) {
		console.log(JSON.stringify(rows))
		async.map(rows, function(row) {
			console.log("row" + JSON.stringify(row))
			var today = new Date();
			var tomorrow = new Date();
			tomorrow.setDate(tomorrow.getDate() + 1);

			year = today.getFullYear();
			month = today.getMonth();
			date = today.getDate();

			tYear = tomorrow.getFullYear();
			tMonth = tomorrow.getMonth();
			tDate = tomorrow.getDate();

			var user_id = row.doc.user_id;
			var access_token = row.doc.access_token;
			var headers = {
				'Authorization':       'Bearer ' + access_token,
				'Api-Key': CLIENT_ID,
				'Content-Type':     'application/json'
			}
			// Configure the request
			var options = {
				url: 'https://api.ua.com/v7.1/aggregate/',
				method: 'GET',
				headers: headers,
				qs: {
					data_types: 'steps_summary,body_mass_summary',
					period: 'P1D',
					start_datetime: year + '-' + month + '-' + date,
					end_datetime: tYear + '-' + tMonth + '-' + tDate,
					user_id: user_id
				}
			}

			// Start the request
			request(options, function (error, response, body) {
			    if (!error && response.statusCode == 200) {
			    	body = JSON.parse(body);
			    	aggregates = body._embedded.aggregates
			    	steps = "0"
			    	body_mass = ""
			    	for (var i in aggregates) {
			    		type = aggregates[i]._links.data_type[0].id
			    		if(type == 'steps_summary') {
			    			steps = aggregates[i].summary.value.steps_sum;
			    		} else if(type == 'body_mass_summary') {
			    				body_mass = aggregates[i].summary.value.mass_avg;
		    			}
			    	}
			        activity = {
			        	steps: steps,
			        	body_mass: body_mass,
			        	user_id: user_id,
			        	date: month + '/' + date + '/' + year
			        }
			        console.log(JSON.stringify(activity))
			        userdb.insertActivities(activity)
			    } else {
			    	console.log(error)
			    }
			})
		}, function(err, results){
			console.log(results);
		});
	});
}
