import { SC2Passage } from "./SC2ApiRef";
import { SC2DataManager } from "./SC2DataManager";
export interface WikifyTracerCallback {
    beforePassage?: (text: string, passageTitle: string, passageObj: SC2Passage) => string;
    afterPassage?: (text: string, passageTitle: string, passageObj: SC2Passage, node: DocumentFragment) => void;
    beforeWikify?: (text: string) => string;
    afterWikify?: (text: string, node: DocumentFragment) => void;
    beforeWidget?: (text: string, widgetName: string, passageTitle?: string, passageObj?: SC2Passage) => string;
    afterWidget?: (text: string, widgetName: string, passageTitle: string | undefined, passageObj: SC2Passage | undefined, node: DocumentFragment) => void;
}
export declare class WikifyTracerCallbackOrder {
    beforePassage: string[];
    afterPassage: string[];
    beforeWikify: string[];
    afterWikify: string[];
    beforeWidget: string[];
    afterWidget: string[];
    addCallback(key: string, c: WikifyTracerCallback): void;
    removeCallback(key: string, c: WikifyTracerCallback): void;
}
export declare class WikifyTracerCallbackCount {
    beforePassage: number;
    afterPassage: number;
    beforeWikify: number;
    afterWikify: number;
    beforeWidget: number;
    afterWidget: number;
    order: WikifyTracerCallbackOrder;
    addCallback(key: string, c: WikifyTracerCallback): void;
    removeCallback(key: string, c: WikifyTracerCallback): void;
    checkDataValid(): boolean;
}
export declare class WikifyTracer {
    gSC2DataManager: SC2DataManager;
    private logger;
    constructor(gSC2DataManager: SC2DataManager);
    private callbackTable;
    private callbackOrder;
    private callbackCount;
    addCallback(key: string, callback: WikifyTracerCallback): void;
    beforePassage(text: string, passageTitle: string, passageObj: SC2Passage): string;
    afterPassage(text: string, passageTitle: string, passageObj: SC2Passage, node: DocumentFragment): void;
    beforeWikify(text: string): string;
    afterWikify(text: string, node: DocumentFragment): void;
    beforeWidget(text: string, widgetName: string, passageTitle?: string, passageObj?: SC2Passage): string;
    afterWidget(text: string, widgetName: string, passageTitle: string | undefined, passageObj: SC2Passage | undefined, node: DocumentFragment): void;
}
//# sourceMappingURL=WikifyTracer.d.ts.map