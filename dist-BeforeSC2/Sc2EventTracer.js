import { newWeakPoolRef } from "./WeakRefPool/WeakRefPool";
const nWPRef = newWeakPoolRef;
export class Sc2EventTracer {
    constructor(thisWin, gSC2DataManager) {
        this.thisWin = thisWin;
        this.gSC2DataManager = gSC2DataManager;
        this.callback = [];
        this.callbackLog = [];
    }
    init() {
        this.thisWin.jQuery(this.thisWin.document).on(":storyready", (event) => {
            // console.log('Sc2EventTracer :storyready');
            for (const x of this.callback) {
                if (x.whenSC2StoryReady) {
                    try {
                        // console.log('Sc2EventTracer :storyready callback', x);
                        this.callbackLog.push([':storyready', nWPRef(x), nWPRef(x)]);
                        x.whenSC2StoryReady();
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
        this.thisWin.jQuery(this.thisWin.document).on(":passageinit", (event) => {
            // console.log('Sc2EventTracer :passageinit');
            const passage = event.passage;
            for (const x of this.callback) {
                if (x.whenSC2PassageInit) {
                    try {
                        // console.log('Sc2EventTracer :passageinit callback', x);
                        this.callbackLog.push([':passageinit', nWPRef(x), nWPRef(x), nWPRef(passage)]);
                        x.whenSC2PassageInit(passage);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
        this.thisWin.jQuery(this.thisWin.document).on(":passagestart", (event) => {
            // console.log('Sc2EventTracer :passagestart');
            const passage = event.passage;
            const content = event.content;
            for (const x of this.callback) {
                if (x.whenSC2PassageStart) {
                    try {
                        // console.log('Sc2EventTracer :passagestart callback', x, passage, content);
                        this.callbackLog.push([':passagestart', nWPRef(x), nWPRef(x), nWPRef(passage), nWPRef(content)]);
                        x.whenSC2PassageStart(passage, content);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
        this.thisWin.jQuery(this.thisWin.document).on(":passagerender", (event) => {
            // console.log('Sc2EventTracer :passagerender');
            const passage = event.passage;
            const content = event.content;
            for (const x of this.callback) {
                if (x.whenSC2PassageRender) {
                    try {
                        // console.log('Sc2EventTracer :passagerender callback', x, passage, content);
                        this.callbackLog.push([':passagerender', nWPRef(x), nWPRef(x), nWPRef(passage), nWPRef(content)]);
                        x.whenSC2PassageRender(passage, content);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
        this.thisWin.jQuery(this.thisWin.document).on(":passagedisplay", (event) => {
            // console.log('Sc2EventTracer :passagedisplay');
            const passage = event.passage;
            const content = event.content;
            for (const x of this.callback) {
                if (x.whenSC2PassageDisplay) {
                    try {
                        // console.log('Sc2EventTracer :passagedisplay callback', x, passage, content);
                        this.callbackLog.push([':passagedisplay', nWPRef(x), nWPRef(x), nWPRef(passage), nWPRef(content)]);
                        x.whenSC2PassageDisplay(passage, content);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
        this.thisWin.jQuery(this.thisWin.document).on(":passageend", (event) => {
            // console.log('Sc2EventTracer :passageend');
            const passage = event.passage;
            const content = event.content;
            for (const x of this.callback) {
                if (x.whenSC2PassageEnd) {
                    try {
                        // console.log('Sc2EventTracer :passageend callback', x, passage, content);
                        this.callbackLog.push([':passageend', nWPRef(x), nWPRef(x), nWPRef(passage), nWPRef(content)]);
                        x.whenSC2PassageEnd(passage, content);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
    }
    addCallback(cb) {
        this.callback.push(cb);
    }
}
//# sourceMappingURL=Sc2EventTracer.js.map