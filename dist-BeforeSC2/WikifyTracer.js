export class WikifyTracerCallbackOrder {
    constructor() {
        this.beforePassage = [];
        this.afterPassage = [];
        this.beforeWikify = [];
        this.afterWikify = [];
        this.beforeWidget = [];
        this.afterWidget = [];
    }
    addCallback(key, c) {
        if (c.beforePassage) {
            this.beforePassage.push(key);
        }
        if (c.afterPassage) {
            this.afterPassage.push(key);
        }
        if (c.beforeWikify) {
            this.beforeWikify.push(key);
        }
        if (c.afterWikify) {
            this.afterWikify.push(key);
        }
        if (c.beforeWidget) {
            this.beforeWidget.push(key);
        }
        if (c.afterWidget) {
            this.afterWidget.push(key);
        }
    }
    removeCallback(key, c) {
        if (c.beforePassage) {
            this.beforePassage.splice(this.beforePassage.indexOf(key), 1);
        }
        if (c.afterPassage) {
            this.afterPassage.splice(this.afterPassage.indexOf(key), 1);
        }
        if (c.beforeWikify) {
            this.beforeWikify.splice(this.beforeWikify.indexOf(key), 1);
        }
        if (c.afterWikify) {
            this.afterWikify.splice(this.afterWikify.indexOf(key), 1);
        }
        if (c.beforeWidget) {
            this.beforeWidget.splice(this.beforeWidget.indexOf(key), 1);
        }
        if (c.afterWidget) {
            this.afterWidget.splice(this.afterWidget.indexOf(key), 1);
        }
    }
}
export class WikifyTracerCallbackCount {
    constructor() {
        this.beforePassage = 0;
        this.afterPassage = 0;
        this.beforeWikify = 0;
        this.afterWikify = 0;
        this.beforeWidget = 0;
        this.afterWidget = 0;
        this.order = new WikifyTracerCallbackOrder();
    }
    addCallback(key, c) {
        if (c.beforePassage) {
            this.beforePassage++;
        }
        if (c.afterPassage) {
            this.afterPassage++;
        }
        if (c.beforeWikify) {
            this.beforeWikify++;
        }
        if (c.afterWikify) {
            this.afterWikify++;
        }
        if (c.beforeWidget) {
            this.beforeWidget++;
        }
        if (c.afterWidget) {
            this.afterWidget++;
        }
        this.order.addCallback(key, c);
    }
    removeCallback(key, c) {
        if (c.beforePassage) {
            this.beforePassage--;
        }
        if (c.afterPassage) {
            this.afterPassage--;
        }
        if (c.beforeWikify) {
            this.beforeWikify--;
        }
        if (c.afterWikify) {
            this.afterWikify--;
        }
        if (c.beforeWidget) {
            this.beforeWidget--;
        }
        if (c.afterWidget) {
            this.afterWidget--;
        }
        this.order.removeCallback(key, c);
    }
    checkDataValid() {
        // order data length must === count
        let ok = true;
        if (this.order.beforePassage.length !== this.beforePassage) {
            console.error('WikifyTracerCallbackCount.checkDataValid: beforePassage length not match', [this.order.beforePassage, this.beforePassage]);
            ok = false;
        }
        if (this.order.afterPassage.length !== this.afterPassage) {
            console.error('WikifyTracerCallbackCount.checkDataValid: afterPassage length not match', [this.order.afterPassage, this.afterPassage]);
            ok = false;
        }
        if (this.order.beforeWikify.length !== this.beforeWikify) {
            console.error('WikifyTracerCallbackCount.checkDataValid: beforeWikify length not match', [this.order.beforeWikify, this.beforeWikify]);
            ok = false;
        }
        if (this.order.afterWikify.length !== this.afterWikify) {
            console.error('WikifyTracerCallbackCount.checkDataValid: afterWikify length not match', [this.order.afterWikify, this.afterWikify]);
            ok = false;
        }
        if (this.order.beforeWidget.length !== this.beforeWidget) {
            console.error('WikifyTracerCallbackCount.checkDataValid: beforeWidget length not match', [this.order.beforeWidget, this.beforeWidget]);
            ok = false;
        }
        if (this.order.afterWidget.length !== this.afterWidget) {
            console.error('WikifyTracerCallbackCount.checkDataValid: afterWidget length not match', [this.order.afterWidget, this.afterWidget]);
            ok = false;
        }
        return ok;
    }
}
export class WikifyTracer {
    constructor(gSC2DataManager) {
        this.gSC2DataManager = gSC2DataManager;
        this.callbackTable = new Map();
        this.callbackOrder = [];
        this.callbackCount = new WikifyTracerCallbackCount();
        this.logger = gSC2DataManager.getModUtils().getLogger();
    }
    addCallback(key, callback) {
        if (this.callbackTable.has(key)) {
            console.warn('WikifyTracer.addCallback: key already exists', [key, callback, this.callbackTable.get(key)]);
            this.logger.warn(`WikifyTracer.addCallback: key already exists [${key}]`);
            this.callbackCount.removeCallback(key, this.callbackTable.get(key));
            this.callbackOrder.splice(this.callbackOrder.indexOf(key), 1);
        }
        this.callbackTable.set(key, callback);
        this.callbackOrder.push(key);
        this.callbackCount.addCallback(key, callback);
        if (!this.callbackCount.checkDataValid()) {
            // never go there
            console.error('WikifyTracer.addCallback: checkDataValid failed', [this.callbackTable, this.callbackOrder, this.callbackCount]);
            this.logger.error(`WikifyTracer.addCallback: checkDataValid failed`);
        }
    }
    beforePassage(text, passageTitle, passageObj) {
        // console.log('beforePassage', [passageTitle, passageObj, text]);
        if (this.callbackCount.beforePassage === 0) {
            // short stop
            return text;
        }
        for (const key of this.callbackCount.order.beforePassage) {
            const callback = this.callbackTable.get(key);
            if (!callback) {
                // never go there
                console.error('WikifyTracer.beforePassage: key not found', [key, this.callbackOrder, this.callbackTable]);
                continue;
            }
            if (callback.beforePassage) {
                try {
                    text = callback.beforePassage(text, passageTitle, passageObj);
                }
                catch (e) {
                    console.error('WikifyTracer.beforePassage', [key, callback, [text, passageTitle, passageObj], e]);
                }
            }
            else {
                // never go there
                console.error('WikifyTracer.beforePassage: callback.beforePassage not found', [key, this.callbackCount, this.callbackOrder, this.callbackTable]);
            }
        }
        return text;
    }
    afterPassage(text, passageTitle, passageObj, node) {
        // console.log('afterPassage', [passageTitle, passageObj, text]);
        if (this.callbackCount.afterPassage === 0) {
            // short stop
            return;
        }
        for (const key of this.callbackCount.order.afterPassage) {
            const callback = this.callbackTable.get(key);
            if (!callback) {
                // never go there
                console.error('WikifyTracer.afterPassage: key not found', [key, this.callbackOrder, this.callbackTable]);
                continue;
            }
            if (callback.afterPassage) {
                try {
                    callback.afterPassage(text, passageTitle, passageObj, node);
                }
                catch (e) {
                    console.error('WikifyTracer.afterPassage', [key, callback, [text, passageTitle, passageObj], e]);
                }
            }
            else {
                // never go there
                console.error('WikifyTracer.afterPassage: callback.beforePassage not found', [key, this.callbackCount, this.callbackOrder, this.callbackTable]);
            }
        }
    }
    beforeWikify(text) {
        // console.log('beforeWikify', [text]);
        if (this.callbackCount.beforeWikify === 0) {
            // short stop
            return text;
        }
        for (const key of this.callbackCount.order.beforeWikify) {
            const callback = this.callbackTable.get(key);
            if (!callback) {
                // never go there
                console.error('WikifyTracer.beforeWikify: key not found', [key, this.callbackOrder, this.callbackTable]);
                continue;
            }
            if (callback.beforeWikify) {
                try {
                    text = callback.beforeWikify(text);
                }
                catch (e) {
                    console.error('WikifyTracer.beforeWikify', [key, callback, [text], e]);
                }
            }
            else {
                // never go there
                console.error('WikifyTracer.beforeWikify: callback.beforePassage not found', [key, this.callbackCount, this.callbackOrder, this.callbackTable]);
            }
        }
        return text;
    }
    afterWikify(text, node) {
        // console.log('afterWikify', [text]);
        if (this.callbackCount.afterWikify === 0) {
            // short stop
            return;
        }
        for (const key of this.callbackCount.order.afterWikify) {
            const callback = this.callbackTable.get(key);
            if (!callback) {
                // never go there
                console.error('WikifyTracer.afterWikify: key not found', [key, this.callbackOrder, this.callbackTable]);
                continue;
            }
            if (callback.afterWikify) {
                try {
                    callback.afterWikify(text, node);
                }
                catch (e) {
                    console.error('WikifyTracer.afterWikify', [key, callback, [text], e]);
                }
            }
            else {
                // never go there
                console.error('WikifyTracer.afterWikify: callback.beforePassage not found', [key, this.callbackCount, this.callbackOrder, this.callbackTable]);
            }
        }
    }
    beforeWidget(text, widgetName, passageTitle, passageObj) {
        // console.log('beforeWidget', [widgetName, passageTitle, passageObj, text]);
        if (this.callbackCount.beforeWidget === 0) {
            // short stop
            return text;
        }
        for (const key of this.callbackCount.order.beforeWikify) {
            const callback = this.callbackTable.get(key);
            if (!callback) {
                // never go there
                console.error('WikifyTracer.beforeWidget: key not found', [key, this.callbackOrder, this.callbackTable]);
                continue;
            }
            if (callback.beforeWidget) {
                try {
                    text = callback.beforeWidget(text, widgetName, passageTitle, passageObj);
                }
                catch (e) {
                    console.error('WikifyTracer.beforeWidget', [key, callback, [text, widgetName, passageTitle, passageObj], e]);
                }
            }
            else {
                // never go there
                console.error('WikifyTracer.beforeWidget: callback.beforePassage not found', [key, this.callbackCount, this.callbackOrder, this.callbackTable]);
            }
        }
        return text;
    }
    afterWidget(text, widgetName, passageTitle, passageObj, node) {
        // console.log('afterWidget', [widgetName, passageTitle, passageObj, text]);
        if (this.callbackCount.afterWidget === 0) {
            // short stop
            return;
        }
        for (const key of this.callbackCount.order.afterWidget) {
            const callback = this.callbackTable.get(key);
            if (!callback) {
                // never go there
                console.error('WikifyTracer.afterWidget: key not found', [key, this.callbackOrder, this.callbackTable]);
                continue;
            }
            if (callback.afterWidget) {
                try {
                    callback.afterWidget(text, widgetName, passageTitle, passageObj, node);
                }
                catch (e) {
                    console.error('WikifyTracer.afterWidget', [key, callback, [text, widgetName, passageTitle, passageObj], e]);
                }
            }
            else {
                // never go there
                console.error('WikifyTracer.afterWidget: callback.beforePassage not found', [key, this.callbackCount, this.callbackOrder, this.callbackTable]);
            }
        }
    }
}
//# sourceMappingURL=WikifyTracer.js.map