var async = require("async");

var userdb = require("./user-db");
var underarmour = require("./ua-client");
var fitbit = require("./fitbit-client");

exports.updateData = function(cb) {
	userdb.getAllUsers(function(rows) {
		async.eachSeries(rows, function(user, cb) {
			var type = user.doc.user_type;
			if(type == "fitbit")
				fitbit.processData(user);
			else if(type == "underarmour")
				underarmour.processData(user)
			setTimeout(function(){ cb();}, 2000);
		});
	});
}
