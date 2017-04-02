var uaclient = require('./ua-client');

exports.timer = function() {
	console.log("Interval is set to get aggregate data of users")
    setInterval(uaclient.getAggregates, (60000*30));
}
