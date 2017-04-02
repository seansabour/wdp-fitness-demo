'use strict';
//Cloudant DB
var Cloudant = require('cloudant');
var me = '724d6155-9384-406e-a51d-970c41e48424-bluemix';
var password = '37d29e2ceb3fd6067a77a86ba019ad23270d935ca121f639366ae3adea2cecd9';

var cloudant = Cloudant({account:me, password:password});
var user_db = cloudant.db.use('fit_users')
var fit_daily_db = cloudant.db.use('fit_daily_activiy');

exports.update = exports.create = function(user) {
    user_db.insert(user, function(err, body, header) {
      if (err) {
        return console.log('[fit_users.insert] ', err.message);
      }
    });
};

exports.read = function(user) {
	user_db.insert(user, function(err, body, header) {
		if (err) {
			return console.log('[fit_users.insert] ', err.message);
		}
	});
};

exports.getAllUsers = function(callback) {
	user_db.list({include_docs:true}, function (err, data) {
		callback(data.rows)
	});
};

exports.insertActivities = function(obj) {
    fit_daily_db.insert(obj, function(err, body, header) {
      if (err) {
        return console.log('[fit_daily_activiy.insert] ', err.message);
      }
    });
};


