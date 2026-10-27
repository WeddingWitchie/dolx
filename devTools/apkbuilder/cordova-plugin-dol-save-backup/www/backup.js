var exec = require("cordova/exec");

function call(action, args) {
	return new Promise(function (resolve, reject) {
		exec(resolve, reject, "DoLSaveBackup", action, args);
	});
}

exports.write = function (payload) { return call("write", [payload]); };
exports.list = function () { return call("list", []); };
exports.read = function (index) { return call("read", [index]); };
