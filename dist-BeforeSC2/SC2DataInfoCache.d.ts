import { LogWrapper } from "ModLoadController";
export interface StyleTextFileItem {
    id: number;
    name: string;
    content: string;
}
export interface ScriptTextFileItem {
    id: number;
    name: string;
    content: string;
}
export interface PassageDataItem {
    id: number;
    name: string;
    tags: string[];
    content: string;
    position?: string;
    size?: string;
}
export declare class CacheRecord<T extends {
    name: string;
    content: string;
}> {
    log: LogWrapper;
    dataSource: string;
    cacheRecordName: string;
    constructor(log: LogWrapper, dataSource: string, cacheRecordName: string);
    clean(): void;
    items: T[];
    fillMap(): void;
    back2Array(): void;
    map: Map<string, T>;
    noName: T[];
    replaceMerge(c: CacheRecord<T>, noWarnning?: boolean): void;
    concatMerge(c: CacheRecord<T>): void;
}
export declare class SC2DataInfo {
    log: LogWrapper;
    dataSource: string;
    styleFileItems: CacheRecord<StyleTextFileItem>;
    scriptFileItems: CacheRecord<ScriptTextFileItem>;
    passageDataItems: CacheRecord<PassageDataItem>;
    constructor(log: LogWrapper, dataSource: string);
    clean(): void;
}
export declare class SC2DataInfoCache extends SC2DataInfo {
    log: LogWrapper;
    dataSource: string;
    scriptNode: HTMLScriptElement[];
    styleNode: HTMLStyleElement[];
    passageDataNodes: HTMLElement[];
    cloneSC2DataInfo(): SC2DataInfo;
    constructor(log: LogWrapper, dataSource: string, scriptNode: HTMLScriptElement[], styleNode: HTMLStyleElement[], passageDataNodes: HTMLElement[]);
}
//# sourceMappingURL=SC2DataInfoCache.d.ts.map