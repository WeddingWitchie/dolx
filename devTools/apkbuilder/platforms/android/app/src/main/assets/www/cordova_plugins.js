cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "cordova-plugin-save-dialog.SaveDialog",
      "file": "plugins/cordova-plugin-save-dialog/www/android/SaveDialog.js",
      "pluginId": "cordova-plugin-save-dialog",
      "clobbers": [
        "cordova.plugins.saveDialog"
      ]
    },
    {
      "id": "cordova-plugin-save-dialog.BlobKeeper",
      "file": "plugins/cordova-plugin-save-dialog/www/android/BlobKeeper.js",
      "pluginId": "cordova-plugin-save-dialog"
    },
    {
      "id": "cordova-plugin-rnk-toast.toast",
      "file": "plugins/cordova-plugin-rnk-toast/www/toast.js",
      "pluginId": "cordova-plugin-rnk-toast",
      "clobbers": [
        "cordova.plugins.rnk.toast"
      ]
    }
  ];
  module.exports.metadata = {
    "cordova-plugin-save-dialog": "2.0.1",
    "cordova-plugin-rnk-toast": "0.0.1"
  };
});