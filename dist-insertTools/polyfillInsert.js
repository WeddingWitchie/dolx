/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./src/insertTools/polyfillInsert.ts":
/*!*******************************************!*\
  !*** ./src/insertTools/polyfillInsert.ts ***!
  \*******************************************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {


var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
const process_1 = __importDefault(__webpack_require__(/*! process */ "process"));
const fs_1 = __importDefault(__webpack_require__(/*! fs */ "fs"));
const path_1 = __webpack_require__(/*! path */ "path");
const util_1 = __webpack_require__(/*! util */ "util");
;
(async () => {
    console.log('process.argv.length', process_1.default.argv.length);
    console.log('process.argv', process_1.default.argv);
    const htmlPath = process_1.default.argv[2];
    const jsPath = process_1.default.argv[3];
    console.log('htmlPath', htmlPath);
    console.log('jsPath', jsPath);
    if (!htmlPath) {
        console.error('no htmlPath');
        process_1.default.exit(-1);
        return;
    }
    if (!jsPath) {
        console.error('no jsPath');
        process_1.default.exit(-1);
        return;
    }
    const htmlF = await (0, util_1.promisify)(fs_1.default.readFile)(htmlPath, { encoding: 'utf-8' });
    const jsF = await (0, util_1.promisify)(fs_1.default.readFile)(jsPath, { encoding: 'utf-8' });
    const firstScriptIndex = htmlF.indexOf('<script');
    const polyfillJSContent = `<script id="polyfill-${(0, path_1.basename)(jsPath)}" type="text/javascript">${jsF}</script>`;
    const newHtmlF = htmlF.slice(0, firstScriptIndex) +
        '\n' + polyfillJSContent +
        '\n' + htmlF.slice(firstScriptIndex);
    const outputFilePath = htmlPath + `.polyfill-${(0, path_1.basename)(jsPath)}.html`;
    console.log(outputFilePath);
    await (0, util_1.promisify)(fs_1.default.writeFile)(outputFilePath, newHtmlF, { encoding: 'utf-8' });
    console.log('=== Congratulation! polyfillInsert done! Everything is ok. ===');
})().catch(e => {
    console.error(e);
    process_1.default.exit(-1);
});


/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

module.exports = require("process");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./src/insertTools/polyfillInsert.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=polyfillInsert.js.map