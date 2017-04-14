var uaclient = require("./ua-client");

exports.timer = function() {
	console.log("Interval is set to get aggregate data of users");
    setInterval(uaclient.processData, (60000*60*6));
}
