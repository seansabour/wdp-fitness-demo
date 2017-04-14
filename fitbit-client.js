var request = require("request");
var async = require("async");
var sleep = require('sleep');

const userdb = require("./user-db");


function getData() {
    var now = new Date();
    var date = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate()
    var headers = {
        "Authorization": "Bearer "+ access_code,
    };

    // Configure the request
    var options = {
        url: "https://api.fitbit.com/1/user/"+user_id+"/activities/steps/date/2017-04-01/"+date+".json",
        headers: headers,
    };
                
    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
        // Print out the response body
        console.log("Printint User Steps:"+ body);
        } else {
            console.log("Error for printing user steps");
            console.log(error);
        }
    });
}


