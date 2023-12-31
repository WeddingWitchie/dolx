export class SC2JsEvalContext {
    constructor(gSC2DataManager) {
        this.gSC2DataManager = gSC2DataManager;
        this.contextSet = [];
    }
    /**
     * call by SugarCube2 `Story.storyInit()`
     */
    newContext(id) {
        const contextThis = {};
        const context = {
            contextThis,
        };
        this.contextSet.push(context);
        return context.contextThis;
    }
}
//# sourceMappingURL=SC2JsEvalContext.js.map