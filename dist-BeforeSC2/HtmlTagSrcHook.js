/**
 * this class replace html image tag src/href attribute ,
 * redirect the image request to a mod like `ImgLoaderHooker` to load the image.
 */
export class HtmlTagSrcHook {
    constructor(gSC2DataManager) {
        this.gSC2DataManager = gSC2DataManager;
        this.hookTable = new Map();
        this.hookReturnModeTable = new Map();
        this.logger = gSC2DataManager.getModUtils().getLogger();
    }
    addHook(hookKey, hook) {
        if (this.hookTable.has(hookKey)) {
            console.error(`[HtmlTagSrcHook] addHook: hookKey already exist!`, [hookKey, hook]);
            this.logger.error(`[HtmlTagSrcHook] addHook: hookKey[${hookKey}] already exist!`);
        }
        this.hookTable.set(hookKey, hook);
    }
    addReturnModeHook(hookKey, hook) {
        if (this.hookReturnModeTable.has(hookKey)) {
            console.error(`[HtmlTagSrcHook] addReturnModeHook: hookKey already exist!`, [hookKey, hook]);
            this.logger.error(`[HtmlTagSrcHook] addReturnModeHook: hookKey[${hookKey}] already exist!`);
        }
        this.hookReturnModeTable.set(hookKey, hook);
    }
    /**
     * covert HtmlElement to use image from mod
     *
     * @example:
     * @code
     * ```typescript
     * const node = document.createElement('img');
     * node.src = 'xxx/xxx/xxx.png';
     * if (node.tagName.toLowerCase() === 'img' && !node.getAttribute('src')?.startsWith('data:')) {
     *     // need check the src is not "data:" URI
     *     node.setAttribute('ML-src', node.getAttribute('src')!);
     *     node.removeAttribute('src');
     *     window.modSC2DataManager.getHtmlTagSrcHook().doHook(node).catch(E => console.error(E));
     * }
     * ```
     */
    async doHook(el, field = 'src') {
        // console.log('[HtmlTagSrcHook] doHook: handing the element', [el, el.outerHTML]);
        const mlSrc = el.getAttribute(`ML-${field}`);
        if (!mlSrc) {
            console.error(`[HtmlTagSrcHook] doHook: no ML-${field}`, [el, el.outerHTML]);
            this.logger.error(`[HtmlTagSrcHook] doHook: no ML-${field} [${el.outerHTML}]`);
            return false;
        }
        // call hook to find a mod hook to handle the element
        // if all mod cannot handle, don't change the element and return false
        for (const [hookKey, hook] of this.hookReturnModeTable) {
            try {
                const r = await hook(mlSrc);
                if (r[0]) {
                    el.setAttribute(field, r[1]);
                    return true;
                }
            }
            catch (e) {
                console.error(`[HtmlTagSrcHook] doHookCallback: call hookKey error`, [hookKey, hook, e]);
                this.logger.error(`[HtmlTagSrcHook] doHookCallback: call hookKey[${hookKey}] error [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
            }
        }
        // console.log('[HtmlTagSrcHook] doHook: cannot handing on hookReturnModeTable of the element', [el, el.outerHTML]);
        for (const [hookKey, hook] of this.hookTable) {
            try {
                if (await hook(el, mlSrc, field)) {
                    return true;
                }
            }
            catch (e) {
                console.error(`[HtmlTagSrcHook] doHook: call hookKey error`, [hookKey, hook, e]);
                this.logger.error(`[HtmlTagSrcHook] doHook: call hookKey[${hookKey}] error [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
            }
        }
        // console.log('[HtmlTagSrcHook] doHook: cannot handing on hookTable of the element', [el, el.outerHTML]);
        // console.log('[HtmlTagSrcHook] doHook: cannot handing the element', [el, el.outerHTML]);
        el.setAttribute('ML-src_replace_failed', '1');
        // if no one can handle the element, do the default action
        // recover the [field]
        el.setAttribute(field, mlSrc);
        return false;
    }
    async doHookCallback(src, callback) {
        // console.log('[HtmlTagSrcHook] doHookCallback: handing src', [src]);
        if (!src) {
            console.error(`[HtmlTagSrcHook] doHookCallback: no src`, [src]);
            this.logger.error(`[HtmlTagSrcHook] doHookCallback: no src [${src}]`);
            return [false, await callback(src)];
        }
        // call hook to find a mod hook to handle the element
        // if all mod cannot handle, don't change the element and return false
        for (const [hookKey, hook] of this.hookReturnModeTable) {
            try {
                const r = await hook(src);
                if (r[0]) {
                    return [true, await callback(r[1])];
                }
            }
            catch (e) {
                console.error(`[HtmlTagSrcHook] doHookCallback: call hookKey error`, [hookKey, hook, e]);
                this.logger.error(`[HtmlTagSrcHook] doHookCallback: call hookKey[${hookKey}] error [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
            }
        }
        // if no one can handle the element, do the default action
        // recover the [field]
        return [false, await callback(src)];
    }
    /**
     * get image from mod
     * @param src  image path
     * @return image base64 string
     */
    async requestImageBySrc(src) {
        // console.log('[HtmlTagSrcHook] requestImageBySrc: handing src', [src]);
        if (!src) {
            console.error(`[HtmlTagSrcHook] requestImageBySrc: no src`, [src]);
            this.logger.error(`[HtmlTagSrcHook] requestImageBySrc: no src [${src}]`);
            return undefined;
        }
        // call hook to find a mod hook to handle the image
        for (const [hookKey, hook] of this.hookReturnModeTable) {
            try {
                const r = await hook(src);
                if (r[0]) {
                    return r[1];
                }
            }
            catch (e) {
                console.error(`[HtmlTagSrcHook] requestImageBySrc: call hookKey error`, [hookKey, hook, e]);
                this.logger.error(`[HtmlTagSrcHook] requestImageBySrc: call hookKey[${hookKey}] error [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
            }
        }
        // if no one can handle the element, do the default action
        return undefined;
    }
}
//# sourceMappingURL=HtmlTagSrcHook.js.map