import { IndexDBLoader, LocalStorageLoader } from "./ModZipReader";
import moment from "moment/moment";
export function getLogFromModLoadControllerCallback(c) {
    return {
        log: (s) => {
            c.logInfo(s);
        },
        warn: (s) => {
            c.logWarning(s);
        },
        error: (s) => {
            c.logError(s);
        },
    };
}
const ModLoadControllerCallback_PatchHook = [
    'PatchModToGame_start',
    'PatchModToGame_end',
];
const ModLoadControllerCallback_ModLoader = [
    'ModLoaderLoadEnd',
];
const ModLoadControllerCallback_ReplacePatch = [
    'ReplacePatcher_start',
    'ReplacePatcher_end',
];
const ModLoadControllerCallback_Log = [
    'logInfo',
    'logWarning',
    'logError',
];
const ModLoadControllerCallback_ScriptLoadHook = [
    'InjectEarlyLoad_start',
    'InjectEarlyLoad_end',
    'EarlyLoad_start',
    'EarlyLoad_end',
    'Load_start',
    'Load_end',
];
const ModLoadControllerCallback_ScriptLazyLoadHook = [
    'LazyLoad_start',
    'LazyLoad_end',
];
/**
 * ModLoader lifetime circle system,
 * mod can register hook to this system, to listen to the lifetime circle of MpdLoader and error log.
 *
 * ModLoader 生命周期系统，
 * mod 可以注册 hook 到这个系统，来监听 ModLoader 的生命周期和错误日志。
 */
export class ModLoadController {
    constructor(gSC2DataManager) {
        this.gSC2DataManager = gSC2DataManager;
        this.logRecordBeforeAnyLogHookRegister = [];
        this.lifeTimeCircleHookTable = new Map();
        ModLoadControllerCallback_ScriptLoadHook.forEach((T) => {
            this[T] = async (modName, fileName) => {
                for (const [id, hook] of this.lifeTimeCircleHookTable) {
                    try {
                        if (hook[T]) {
                            await hook[T].apply(hook, [modName, fileName]);
                        }
                    }
                    catch (e) {
                        console.error('ModLoadController', [T, id, e]);
                        this.logError(`ModLoadController ${T} ${id} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
                    }
                }
            };
        });
        ModLoadControllerCallback_ScriptLazyLoadHook.forEach((T) => {
            this[T] = async (modName) => {
                for (const [id, hook] of this.lifeTimeCircleHookTable) {
                    try {
                        if (hook[T]) {
                            await hook[T].apply(hook, [modName]);
                        }
                    }
                    catch (e) {
                        console.error('ModLoadController', [T, id, e]);
                        this.logError(`ModLoadController ${T} ${id} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
                    }
                }
            };
        });
        ModLoadControllerCallback_PatchHook.forEach((T) => {
            this[T] = async () => {
                for (const [id, hook] of this.lifeTimeCircleHookTable) {
                    try {
                        if (hook[T]) {
                            await hook[T].apply(hook, []);
                        }
                    }
                    catch (e) {
                        console.error('ModLoadController', [T, id, e]);
                        this.logError(`ModLoadController ${T} ${id} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
                    }
                }
            };
        });
        ModLoadControllerCallback_ModLoader.forEach((T) => {
            this[T] = async () => {
                for (const [id, hook] of this.lifeTimeCircleHookTable) {
                    try {
                        if (hook[T]) {
                            await hook[T].apply(hook, []);
                        }
                    }
                    catch (e) {
                        console.error('ModLoadController', [T, id, e]);
                        this.logError(`ModLoadController ${T} ${id} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
                    }
                }
            };
        });
        ModLoadControllerCallback_ReplacePatch.forEach((T) => {
            this[T] = async (modName, fileName) => {
                for (const [id, hook] of this.lifeTimeCircleHookTable) {
                    try {
                        if (hook[T]) {
                            await hook[T].apply(hook, [modName, fileName]);
                        }
                    }
                    catch (e) {
                        console.error('ModLoadController', [T, id, e]);
                        this.logError(`ModLoadController ${T} ${id} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
                    }
                }
            };
        });
        ModLoadControllerCallback_Log.forEach((T) => {
            this[T] = (s) => {
                let logOutput = false;
                for (const [id, hook] of this.lifeTimeCircleHookTable) {
                    try {
                        if (hook[T]) {
                            hook[T].apply(hook, [s]);
                            logOutput = true;
                        }
                    }
                    catch (e) {
                        // must never throw error
                        console.error('ModLoadController', [T, id, e]);
                    }
                }
                if (!logOutput) {
                    switch (T) {
                        case "logInfo":
                            this.logRecordBeforeAnyLogHookRegister.push({
                                type: 'info',
                                time: moment(),
                                message: s,
                            });
                            break;
                        case "logWarning":
                            this.logRecordBeforeAnyLogHookRegister.push({
                                type: 'warning',
                                time: moment(),
                                message: s,
                            });
                            break;
                        case "logError":
                            this.logRecordBeforeAnyLogHookRegister.push({
                                type: 'error',
                                time: moment(),
                                message: s,
                            });
                            break;
                    }
                }
            };
        });
        this.logInfo(`ModLoader ========= version: [${gSC2DataManager.getModUtils().version}]`);
    }
    async canLoadThisMod(bootJson, zip) {
        for (const [hookId, hook] of this.lifeTimeCircleHookTable) {
            try {
                if (hook.canLoadThisMod) {
                    const r = await hook.canLoadThisMod(bootJson, zip);
                    if (!r) {
                        console.warn(`ModLoadController canLoadThisMod() mod [${bootJson.name}] be banned by [${hookId}]`);
                        this.getLog().warn(`ModLoadController canLoadThisMod() mod [${bootJson.name}] be banned by [${hookId}]`);
                        return false;
                    }
                }
            }
            catch (e) {
                console.error('ModLoadController canLoadThisMod()', [hookId, e]);
                this.getLog().error(`ModLoadController canLoadThisMod() ${hookId} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
            }
        }
        return true;
    }
    async afterModLoad(bootJson, zip, modInfo) {
        for (const [id, hook] of this.lifeTimeCircleHookTable) {
            try {
                if (hook.afterModLoad) {
                    await hook.afterModLoad(bootJson, zip, modInfo);
                }
            }
            catch (e) {
                console.error('ModLoadController afterModLoad()', [id, e]);
                this.getLog().error(`ModLoadController afterModLoad() ${id} ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
            }
        }
    }
    /**
     * call by ModLoaderGui (inner use)
     * @param zip
     */
    async exportDataZip(zip) {
        for (const [id, hook] of this.lifeTimeCircleHookTable) {
            try {
                if (hook.exportDataZip) {
                    zip = await hook.exportDataZip(zip);
                }
            }
            catch (e) {
                console.error('ModLoadController exportDataZip()', e);
                this.logError(`ModLoadController exportDataZip() ${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}`);
            }
        }
        return zip;
    }
    addLifeTimeCircleHook(id, hook) {
        if (this.lifeTimeCircleHookTable.has(id)) {
            console.error(`ModLoadController addLifeTimeCircleHook() id [${id}] already exists.`);
            this.logError(`ModLoadController addLifeTimeCircleHook() id [${id}] already exists.`);
        }
        this.lifeTimeCircleHookTable.set(id, hook);
    }
    removeLifeTimeCircleHook(hook) {
        // TODO
    }
    clearLifeTimeCircleHook() {
        this.lifeTimeCircleHookTable.clear();
    }
    listModLocalStorage() {
        return LocalStorageLoader.listMod() || [];
    }
    addModLocalStorage(name, modBase64String) {
        return LocalStorageLoader.addMod(name, modBase64String);
    }
    removeModLocalStorage(name) {
        return LocalStorageLoader.removeMod(name);
    }
    async checkModZipFileLocalStorage(modBase64String) {
        return LocalStorageLoader.checkModZipFile(modBase64String);
    }
    async overwriteModIndexDBModList(modeList) {
        await IndexDBLoader.setModList(modeList);
    }
    async overwriteModIndexDBHiddenModList(modeList) {
        await IndexDBLoader.setHiddenModList(modeList);
    }
    async listModIndexDB() {
        return await IndexDBLoader.listMod() || [];
    }
    async loadHiddenModList() {
        return await IndexDBLoader.loadHiddenModList() || [];
    }
    addModIndexDB(name, modBase64String) {
        return IndexDBLoader.addMod(name, modBase64String);
    }
    removeModIndexDB(name) {
        return IndexDBLoader.removeMod(name);
    }
    async checkModZipFileIndexDB(modBase64String) {
        return IndexDBLoader.checkModZipFile(modBase64String);
    }
    getLog() {
        return {
            log: (s) => {
                this.logInfo(s);
            },
            warn: (s) => {
                this.logWarning(s);
            },
            error: (s) => {
                this.logError(s);
            },
        };
    }
}
//# sourceMappingURL=ModLoadController.js.map