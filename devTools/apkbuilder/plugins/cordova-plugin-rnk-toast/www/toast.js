var exec = require('cordova/exec');

var CLASS_NAME = 'ToastPlugin'

module.exports = {
    SHORT: 0,
    LONG: 1,

    showToast: function (arg0, arg1, success, error) {
        arg0 = arg0 ? arg0 : "Empty";
        arg1 = arg1 ? arg1 : 0;
        exec(success, error, CLASS_NAME, 'showToast', [arg0, arg1]);
    },

};