import { SC2DataInfo } from "./SC2DataInfoCache";
import { SimulateMergeResult } from "./SimulateMerge";
import { IndexDBLoader, LazyLoader, LocalLoader, LocalStorageLoader, ModZipReader, RemoteLoader } from "./ModZipReader";
import { SC2DataManager } from "./SC2DataManager";
import { LogWrapper, ModLoadControllerCallback } from "./ModLoadController";
import { ReplacePatcher } from "./ReplacePatcher";
import { ModOrderContainer, ModOrderContainer_One_ReadonlyMap, ModOrderItem } from "./ModOrderContainer";
import { LRUCache } from 'lru-cache';
import JSZip from 'jszip';
export interface IModImgGetter {
    /**
     * @return Promise<string>   base64 img string
     */
    getBase64Image(lruCache?: IModImgGetterLRUCache): Promise<string>;
}
export declare const StaticModImgLruCache: LRUCache<string, string, unknown>;
export interface IModImgGetterLRUCache {
    get(path: string): string | undefined;
    set(path: string, data: string): IModImgGetterLRUCache;
}
export declare class ModImgGetterDefault implements IModImgGetter {
    zip: ModZipReader;
    imgPath: string;
    logger: LogWrapper;
    constructor(zip: ModZipReader, imgPath: string, logger: LogWrapper);
    getBase64Image(lruCache?: IModImgGetterLRUCache): Promise<string>;
}
export interface ModImg {
    getter: IModImgGetter;
    path: string;
}
export interface ModBootJsonAddonPlugin {
    modName: string;
    addonName: string;
    modVersion: string;
    params?: any[] | {
        [key: string]: any;
    };
}
export declare function checkModBootJsonAddonPlugin(v: any): v is ModBootJsonAddonPlugin;
export interface DependenceInfo {
    modName: string;
    version: string;
}
export declare function checkDependenceInfo(v: any): v is DependenceInfo;
export interface ModBootJson {
    name: string;
    version: string;
    styleFileList: string[];
    scriptFileList: string[];
    scriptFileList_preload?: string[];
    scriptFileList_earlyload?: string[];
    scriptFileList_inject_early?: string[];
    tweeFileList: string[];
    imgFileList: string[];
    replacePatchList?: string[];
    additionFile: string[];
    additionBinaryFile?: string[];
    addonPlugin?: ModBootJsonAddonPlugin[];
    dependenceInfo?: DependenceInfo[];
}
export interface ModInfo {
    name: string;
    version: string;
    cache: SC2DataInfo;
    imgs: ModImg[];
    /**
     * origin path, replace path
     *
     * @deprecated the imgFileReplaceList not work and never implemented, don't use it.
     *             Please use `ImageLoaderAddon` or `BeautySelectorAddon` instead.
     * @see `ImageLoaderAddon` https://github.com/Lyoko-Jeremie/DoL_ImgLoaderHooker
     * @see `BeautySelectorAddon` https://github.com/Lyoko-Jeremie/DoL_BeautySelectorAddonMod
     */
    imgFileReplaceList: [string, string][];
    /**
     * file name, file content
     */
    scriptFileList_preload: [string, string][];
    /**
     * file name, file content
     */
    scriptFileList_earlyload: [string, string][];
    /**
     * file name, file content
     */
    scriptFileList_inject_early: [string, string][];
    replacePatcher: ReplacePatcher[];
    bootJson: ModBootJson;
    modRef: {
        [key: string]: any;
    } | undefined;
}
export declare enum ModDataLoadType {
    'Remote' = "Remote",
    'Local' = "Local",
    'LocalStorage' = "LocalStorage",
    'IndexDB' = "IndexDB"
}
export declare class ModLoader {
    gSC2DataManager: SC2DataManager;
    modLoadControllerCallback: ModLoadControllerCallback;
    thisWin: Window;
    logger: LogWrapper;
    constructor(gSC2DataManager: SC2DataManager, modLoadControllerCallback: ModLoadControllerCallback, thisWin: Window);
    /**
     * 已读取的mod列表（加载但没有初始化）
     * The mod list that already read (load but not init)
     */
    private modReadCache;
    /**
     * 已加载的mod列表（加载并完成初始化）
     * The mod list that already loaded (load and init)
     */
    private modCache;
    /**
     * 已加载的Lazy mod列表（使用 `lazyRegisterNewMod` 加载但未完成初始化）
     * The Lazy mod list that already loaded (load use `lazyRegisterNewMod` but not init)
     */
    private modLazyCache;
    modLoadRecord: ModOrderItem[];
    /**
     * O(2n)
     */
    getModCacheOneArray(): ModOrderItem[];
    /**
     O(n)
     */
    getModCacheArray(): ModOrderItem[];
    /**
     O(1)
     */
    getModCacheMap(): ModOrderContainer_One_ReadonlyMap;
    /**
     * O(n+2log(n))
     */
    checkModCacheData(): boolean;
    /**
     O(n)
     */
    checkModCacheUniq(): boolean;
    /**
     O(1)
     */
    getModCacheByNameOne(modName: string): ModOrderItem | undefined;
    getModReadCache(): ModOrderContainer;
    checkModConflictList(): {
        mod: SC2DataInfo;
        result: SimulateMergeResult;
    }[];
    private modIndexDBLoader?;
    private modLocalStorageLoader?;
    private modLocalLoader?;
    private modRemoteLoader?;
    private modLazyLoader?;
    getIndexDBLoader(): IndexDBLoader | undefined;
    getLocalStorageLoader(): LocalStorageLoader | undefined;
    getLocalLoader(): LocalLoader | undefined;
    getRemoteLoader(): RemoteLoader | undefined;
    getLazyLoader(): LazyLoader | undefined;
    loadOrder: ModDataLoadType[];
    private addModReadZip;
    loadMod(loadOrder: ModDataLoadType[]): Promise<boolean>;
    private registerMod2Addon;
    protected triggerAfterModLoad(): Promise<void>;
    protected filterModCanLoad(modeC: ModOrderContainer): Promise<ModOrderContainer>;
    lazyRegisterNewMod(modeZip: JSZip): Promise<boolean>;
    private do_initModInjectEarlyLoadInDomScript;
    private initModInjectEarlyLoadInDomScript;
    private do_initModEarlyLoadScript;
    private initModEarlyLoadScript;
    getModEarlyLoadCache(): ModOrderContainer;
    getModByNameOne(modName: string): ModOrderItem | undefined;
    getModZip(modName: string): ModZipReader | undefined;
    private loadEndModList?;
    private toLoadModList?;
    private nowLoadedMod?;
    private newNowMod?;
    private replacedNowMod?;
    private tryInitWaitingLazyLoadMod;
}
//# sourceMappingURL=ModLoader.d.ts.map