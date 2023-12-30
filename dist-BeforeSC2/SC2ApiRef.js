export var SC2Passage;
(function (SC2Passage) {
    function getExcerptFromNode(node, count) {
        // type placeholder
        return "";
    }
    SC2Passage.getExcerptFromNode = getExcerptFromNode;
    function getExcerptFromText(text, count) {
        // type placeholder
        return "";
    }
    SC2Passage.getExcerptFromText = getExcerptFromText;
})(SC2Passage || (SC2Passage = {}));
export var SC2Wikifier;
(function (SC2Wikifier) {
    // export interface Option {
    //
    // }
    // export interface Parser {
    //
    // }
    function lastPassageQPush(passageObj, passageTitle) {
        // type placeholder
        return 0;
    }
    SC2Wikifier.lastPassageQPush = lastPassageQPush;
    function lastPassageQPop() {
        // type placeholder
        return 0;
    }
    SC2Wikifier.lastPassageQPop = lastPassageQPop;
    function lastPassageQSize() {
        // type placeholder
        return 0;
    }
    SC2Wikifier.lastPassageQSize = lastPassageQSize;
    function lastPassageQFront() {
        // type placeholder
        return [0, {}];
    }
    SC2Wikifier.lastPassageQFront = lastPassageQFront;
    function lastPassageQBack() {
        // type placeholder
        return [0, {}];
    }
    SC2Wikifier.lastPassageQBack = lastPassageQBack;
    function getLastPossiblePassageTitle() {
        // type placeholder
        return "";
    }
    SC2Wikifier.getLastPossiblePassageTitle = getLastPossiblePassageTitle;
    function getPassageTitleLast() {
        // type placeholder
        return "";
    }
    SC2Wikifier.getPassageTitleLast = getPassageTitleLast;
    function getPassageObjLast() {
        // type placeholder
        return {};
    }
    SC2Wikifier.getPassageObjLast = getPassageObjLast;
    function wikifyEval(text, passageObj, passageTitle) {
        // type placeholder
        return document.createDocumentFragment();
    }
    SC2Wikifier.wikifyEval = wikifyEval;
    function createInternalLink(destination, passage, text, callback) {
        // type placeholder
        return document.createDocumentFragment();
    }
    SC2Wikifier.createInternalLink = createInternalLink;
    function createExternalLink(destination, url, text) {
        // type placeholder
        return document.createDocumentFragment();
    }
    SC2Wikifier.createExternalLink = createExternalLink;
    function isExternalLink(link) {
        // type placeholder
        return false;
    }
    SC2Wikifier.isExternalLink = isExternalLink;
})(SC2Wikifier || (SC2Wikifier = {}));
export class SC2ApiRef {
    constructor(gSC2DataManager) {
        this.gSC2DataManager = gSC2DataManager;
        this.isInit = false;
    }
    init() {
    }
}
//# sourceMappingURL=SC2ApiRef.js.map