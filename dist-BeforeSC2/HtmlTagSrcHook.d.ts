import { SC2DataManager } from "./SC2DataManager";
import { LogWrapper } from "./ModLoadController";
export type HtmlTagSrcHookType = (el: HTMLImageElement | HTMLElement, mlSrc: string, field: string) => Promise<boolean>;
export type HtmlTagSrcReturnModeHookType = (mlSrc: string) => Promise<[boolean, string]>;
/**
 * this class replace html image tag src/href attribute ,
 * redirect the image request to a mod like `ImgLoaderHooker` to load the image.
 */
export declare class HtmlTagSrcHook {
    gSC2DataManager: SC2DataManager;
    logger: LogWrapper;
    constructor(gSC2DataManager: SC2DataManager);
    private hookTable;
    private hookReturnModeTable;
    addHook(hookKey: string, hook: HtmlTagSrcHookType): void;
    addReturnModeHook(hookKey: string, hook: HtmlTagSrcReturnModeHookType): void;
    doHook(el: HTMLImageElement | HTMLElement, field?: string): Promise<boolean>;
    doHookCallback(src: string, callback: (src: string) => any): Promise<[boolean, any]>;
    requestImageBySrc(src: string): Promise<string | undefined>;
}
//# sourceMappingURL=HtmlTagSrcHook.d.ts.map