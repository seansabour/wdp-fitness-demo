var updater = require("./updater");

exports.timer = function() {
	console.log("Interval is set to get aggregate data of users");
    setInterval(updater.updateData, (60000*60*6));
    // setInterval(updater.updateData, (30000*1));
}
