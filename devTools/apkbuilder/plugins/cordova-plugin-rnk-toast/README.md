# ToastPlugin
Android Toast for cordova
- [ToastPlugin](#toastplugin)
- [Install](#install)
- [Uninstall](#uninstall)
- [Usage](#usage)
- [Example](#example)
    - [Callback](#callback)
    - [Set Toast Duration](#set-toast-duration)
- [Plugin](#plugin)


# Install
`cordova plugin add cordova-plugin-rnk-toast`
# Uninstall
`cordova plugin rm cordova-plugin-rnk-toast`

# Usage
`cordova.plugins.rnk.toast.showToast(String msg, number duration, success, error)`

# Example
```JavaScript
// plugin will be availbale on deviceready event

var Toast;
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log(cordova.plugins.rnk.toast);
    Toast = cordova.plugins.rnk.toast;
}

// show a simple toast
function showShortToast(){
    Toast.showToast("My short toast");
}

// show a long toast
function showLongToast(){
    Toast.showToast("My long toast", Toast.LONG) 
}



```

### Callback
```JavaScript

// callback after toast triggered
function showToastWithCallback(){
    Toast.showToast("My long toast", 0, success, error) 
}

function success(res){
    console.log(res)
}
function error(err){
    console.log(err)
}
```
### Set Toast Duration
```JavaScript
Toast.SHORT = 0 // number default
Toast.LONG = 1  // number
```

# Plugin

| Platform | Toast |   |   |   |
|----------|-------|---|---|---|
| android  | ✅     |   |   |   |
| ios      | ❌     |   |   |   |


 
