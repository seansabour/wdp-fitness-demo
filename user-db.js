'use strict';
//Cloudant DB
var Cloudant = require('cloudant');
var me = "paulportela";
var apikey = "thentskewitingliterentse";
var password = "a3895adfe69c5717b1eba348c4fd26e56ce443ae";
var cloudant = Cloudant({account:me, key:apikey, password:password});

var user_db = cloudant.db.use('fit_users')
var fit_steps = cloudant.db.use('fit_steps');
var fit_mass = cloudant.db.use('fit_body_mass');


exports.getAllUsers = function(callback) {
	user_db.list({include_docs:true}, function (err, data) {
		callback(data.rows)
	});
};

exports.insertSteps = function(obj, cb) {
    fit_steps.insert(obj, function(err, body, header) {
      if (!err)
        cb();
      else
        console.log('[fit_steps.insert] ', err.message);
    });
};

exports.insertMass = function(obj, cb) {
    fit_mass.insert(obj, function(err, body, header) {
      if (!err)
        cb();
      else
        console.log('[fit_body_mass.insert] ', err.message);
    });
};

exports.getSteps = function(id, cb) {
  fit_steps.get(id, function(err, data) {
    if(!err) {
      cb(data);
    }
    else {
      console.log('GET STEPS ', err.message)
      cb(null);
    }
  });
}

exports.getMass = function(id, cb) {
  fit_mass.get(id, function(err, data) {
    if(!err)
      cb(data);
    else
      cb(null);
  });
}
