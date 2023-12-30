import JSZip from "jszip";
import { UseStore } from 'idb-keyval';
import { ModBootJson, ModInfo } from "./ModLoader";
import { LogWrapper, ModLoadControllerCallback } from "./ModLoadController";
export interface Twee2PassageR {
    name: string;
    tags: string[];
    contect: string;
}
export declare function Twee2Passage(s: string): Twee2PassageR[];
export declare function imgWrapBase64Url(fileName: string, base64: string): string;
export declare class ModZipReader {
    loaderBase: LoaderBase;
    modLoadControllerCallback: ModLoadControllerCallback;
    log: LogWrapper;
    private gcFinalizationRegistry;
    private _zip;
    private _zipWeakRef;
    private _zipIsExist;
    get zip(): JSZip;
    constructor(zip: JSZip, loaderBase: LoaderBase, modLoadControllerCallback: ModLoadControllerCallback);
    modInfo?: ModInfo;
    getModInfo(): ModInfo | undefined;
    getZipFile(): JSZip | undefined;
    gcReleaseZip(): void;
    gcCheckReleased(): [boolean, boolean, boolean | null];
    gcIsReleased(): boolean;
    static validateBootJson(bootJ: any, log?: LogWrapper): bootJ is ModBootJson;
    static modBootFilePath: string;
    init(): Promise<boolean>;
    refillCacheStyleFileItems(styleFileList: string[], keepOld: boolean): Promise<void>;
    refillCachePassageDataItems(tweeFileList: string[], keepOld: boolean): Promise<void>;
    refillCacheScriptFileItems(scriptFileList: string[], keepOld: boolean): Promise<void>;
    constructModInfoCache(bootJ: ModBootJson, keepOld: boolean): Promise<void>;
}
export declare class LoaderBase {
    log: ModLoadControllerCallback;
    modList: ModZipReader[];
    modZipList: Map<string, ModZipReader[]>;
    constructor(log: ModLoadControllerCallback);
    getZipFile(name: string): ModZipReader[] | undefined;
    addZipFile(name: string, zip: ModZipReader): void;
    load(): Promise<boolean>;
}
export declare class LocalStorageLoader extends LoaderBase {
    static modDataLocalStorageZipList: string;
    load(): Promise<boolean>;
    static listMod(): string[] | undefined;
    static calcModNameKey(name: string): string;
    static addMod(name: string, modBase64String: string): void;
    static removeMod(name: string): void;
    static checkModZipFile(modBase64String: string): Promise<string | ModBootJson>;
}
export declare class IndexDBLoader extends LoaderBase {
    modLoadControllerCallback: ModLoadControllerCallback;
    static dbName: string;
    static storeName: string;
    static modDataIndexDBZipList: string;
    customStore: UseStore;
    constructor(modLoadControllerCallback: ModLoadControllerCallback);
    load(): Promise<boolean>;
    static listMod(): Promise<string[] | undefined>;
    static calcModNameKey(name: string): string;
    static addMod(name: string, modBase64String: string): Promise<void>;
    static removeMod(name: string): Promise<void>;
    static checkModZipFile(modBase64String: string): Promise<string | ModBootJson>;
}
export declare class Base64ZipStringLoader extends LoaderBase {
    modLoadControllerCallback: ModLoadControllerCallback;
    base64ZipStringList: string[];
    constructor(modLoadControllerCallback: ModLoadControllerCallback, base64ZipStringList: string[]);
    load(): Promise<boolean>;
}
export declare class LocalLoader extends LoaderBase {
    modLoadControllerCallback: ModLoadControllerCallback;
    thisWin: Window;
    modDataValueZipListPath: string;
    constructor(modLoadControllerCallback: ModLoadControllerCallback, thisWin: Window);
    load(): Promise<boolean>;
}
export declare class RemoteLoader extends LoaderBase {
    modDataRemoteListPath: string;
    load(): Promise<boolean>;
}
export declare class LazyLoader extends LoaderBase {
    add(modeZip: JSZip): Promise<ModZipReader>;
    load(): Promise<boolean>;
}
//# sourceMappingURL=ModZipReader.d.ts.map