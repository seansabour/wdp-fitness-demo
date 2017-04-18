'use strict';
//Cloudant DB
var Cloudant = require('cloudant');
var me = "gobot";
var apikey = "iturcationdelyarmseempea";
var password = "2ea72dd2d4894ddda713902dc160e479b2a21809";
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

// user_db.destroy("3100021F7S", "1-7a25cc520ab7364c8c2c5a33d241be21", function(err, data) {
//   console.log(data);
// })
// user_db.list({include_docs:true}, function (err, data) {
//     console.log(JSON.stringify(data));
// });
fit_steps.list({include_docs:true}, function (err, data) {
    console.log(JSON.stringify(data));
});