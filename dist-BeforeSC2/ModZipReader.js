import JSZip from "jszip";
import { every, get, has, isArray, isPlainObject, isString, uniq, isEqual } from "lodash";
import { get as keyval_get, set as keyval_set, del as keyval_del, createStore, setMany } from 'idb-keyval';
import { SC2DataInfo } from "./SC2DataInfoCache";
import { checkDependenceInfo, checkModBootJsonAddonPlugin, ModImgGetterDefault } from "./ModLoader";
import { getLogFromModLoadControllerCallback } from "./ModLoadController";
import { extname } from "./extname";
import { ReplacePatcher, checkPatchInfo } from "./ReplacePatcher";
import JSON5 from 'json5';
export function Twee2Passage(s) {
    var _a;
    // match:
    //      :: Widgets Bodywriting Objects [widget]
    //      :: Widgets Bodywriting Objects
    //      :: Widgets Bodywriting Objects [widget asdasd]
    // special allow :
    //      :: Widgets Bodywriting Objects []
    const r = s.split(/^(:: +((?:[^:"\\/\n\r\[\] ]+ *)+)(?: +\[((?:\w+ *)+)?\] *|))$/gm);
    // console.log('Twee2Passage split ', r, [s]);
    // ['xxx', ':: Widgets Bodywriting Objects [widget]', 'Widgets Bodywriting Objects', 'widget', 'xxx']
    // ['xxx', ':: Widgets Bodywriting Objects [widget]', 'Widgets Bodywriting Objects', undefined, 'xxx']
    const rr = [];
    for (let i = 0; i < r.length; i++) {
        if (r[i].startsWith(':: ')) {
            rr.push({
                name: r[++i],
                tags: ((_a = r[++i]) === null || _a === void 0 ? void 0 : _a.split(' ')) || [],
                contect: r[++i],
            });
        }
    }
    return rr;
}
export function imgWrapBase64Url(fileName, base64) {
    let ext = extname(fileName);
    if (ext.startsWith('.')) {
        ext = ext.substring(1);
    }
    // console.log('imgWrapBase64Url', [fileName, ext, base64]);
    return `data:image/${ext};base64,${base64}`;
}
export async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            // reader.result包含了base64数据URL，格式如: data:image/jpeg;base64,/9j/4AAQ...
            // 如果只需要base64字符串部分，可以用split(',')[1]获取
            resolve(reader.result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}
export class ModZipReaderHash {
    constructor(zipBase64String) {
        // this.hash = fnv1a(zipBase64String, {size: 64});
        this._zipBase64String = zipBase64String;
    }
    // https://developer.mozilla.org/zh-CN/docs/Web/API/SubtleCrypto/digest
    async digestMessage(message) {
        const msgUint8 = new TextEncoder().encode(message); // 编码为（utf-8）Uint8Array
        const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgUint8); // 计算消息的哈希值
        const hashArray = Array.from(new Uint8Array(hashBuffer)); // 将缓冲区转换为字节数组
        return hashArray;
    }
    async init() {
        if (this._hash) {
            this._zipBase64String = undefined;
            return;
        }
        if (!this._zipBase64String) {
            // never go there
            console.error('ModZipReaderHash init() this._zipBase64String is undefined.');
            throw new Error('ModZipReaderHash init() this._zipBase64String is undefined.');
        }
        this._hash = await this.digestMessage(this._zipBase64String);
        this._zipBase64String = undefined;
    }
    compare(h) {
        return isEqual(this._hash, h._hash);
    }
    compareWithString(h) {
        try {
            return isEqual(this._hash, this.fromString(h));
        }
        catch (e) {
            return false;
        }
    }
    toString() {
        if (!this._hash) {
            // never go there
            console.error('ModZipReaderHash toString() this._hash is undefined.');
            throw new Error('ModZipReaderHash toString() this._hash is undefined.');
        }
        const hashHex = this._hash
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(""); // 将字节数组转换为十六进制字符串
        return hashHex;
    }
    fromString(hash) {
        return hash.match(/.{2}/g).map((byte) => parseInt(byte, 16));
    }
}
export class ModZipReader {
    get zip() {
        var _a, _b;
        if (!this._zip) {
            console.error('ModZipReader zip was released.', [this.modInfo, this]);
            this.log.error(`ModZipReader zip was released. [${(_a = this.modInfo) === null || _a === void 0 ? void 0 : _a.name}]`);
            throw new Error(`ModZipReader zip was released. [${(_b = this.modInfo) === null || _b === void 0 ? void 0 : _b.name}]`);
        }
        return this._zip;
    }
    constructor(zip, zipBase64String, loaderBase, modLoadControllerCallback) {
        this.loaderBase = loaderBase;
        this.modLoadControllerCallback = modLoadControllerCallback;
        this.log = getLogFromModLoadControllerCallback(modLoadControllerCallback);
        if (typeof FinalizationRegistry === 'undefined') {
            this.gcFinalizationRegistry = new FinalizationRegistryMock(() => {
                // never be call
            });
            this._zipIsExist = null;
            console.warn('ModZipReader FinalizationRegistry is not support.');
        }
        else {
            this.gcFinalizationRegistry = new FinalizationRegistry(() => {
                console.log('ModZipReader zip was released.', [this.modInfo, this]);
                this._zipIsExist = true;
            });
            this._zipIsExist = false;
            // console.warn('ModZipReader FinalizationRegistry is support.');
        }
        // this._zipWeakRef = new WeakRef(zip);
        this._zip = zip;
        this.modZipReaderHash = new ModZipReaderHash(zipBase64String);
        this.gcFinalizationRegistry.register(this._zip, undefined, this);
    }
    getModInfo() {
        return this.modInfo;
    }
    getZipFile() {
        return this._zip;
    }
    /**
     * use this to release zip object ref, try to remove the object from memory.
     */
    gcReleaseZip() {
        var _a, _b;
        console.log(`ModLoader ====== ModZipReader gcReleaseZip [${(_a = this.modInfo) === null || _a === void 0 ? void 0 : _a.name}]`);
        this.log.log(`ModLoader ====== ModZipReader gcReleaseZip [${(_b = this.modInfo) === null || _b === void 0 ? void 0 : _b.name}]`);
        this._zip = undefined;
    }
    /**
     * use this to debug check if the zip object is really released.
     * @return [isRefExist(true), isWeakRefExist(false), isWeakRefCleanBeCall(true/(null if not support))]
     *       only when the return is [true, false, true] the zip object is really released.
     */
    gcCheckReleased() {
        return [
            !!this._zip,
            // !!this._zipWeakRef.deref(),
            this._zipIsExist,
        ];
    }
    gcIsReleased() {
        return !this._zip;
    }
    static validateBootJson(bootJ, log) {
        let c = bootJ
            && isString(get(bootJ, 'name'))
            && get(bootJ, 'name').length > 0
            && isString(get(bootJ, 'version'))
            && get(bootJ, 'version').length > 0
            && isArray(get(bootJ, 'styleFileList'))
            && every(get(bootJ, 'styleFileList'), isString)
            && isArray(get(bootJ, 'scriptFileList'))
            && every(get(bootJ, 'scriptFileList'), isString)
            && isArray(get(bootJ, 'tweeFileList'))
            && every(get(bootJ, 'tweeFileList'), isString)
            && isArray(get(bootJ, 'imgFileList'))
            && every(get(bootJ, 'imgFileList'), isString);
        // optional
        if (c && has(bootJ, 'nickName')) {
            c = c && (isString(get(bootJ, 'nickName')) || (isPlainObject(get(bootJ, 'nickName'))));
        }
        if (c && has(bootJ, 'alias')) {
            c = c && (isArray(get(bootJ, 'alias')) && every(get(bootJ, 'alias'), isString));
        }
        if (c && has(bootJ, 'dependenceInfo')) {
            c = c && (isArray(get(bootJ, 'dependenceInfo')) && every(get(bootJ, 'dependenceInfo'), checkDependenceInfo));
        }
        if (c && has(bootJ, 'addonPlugin')) {
            c = c && (isArray(get(bootJ, 'addonPlugin')) && every(get(bootJ, 'addonPlugin'), checkModBootJsonAddonPlugin));
        }
        if (c && has(bootJ, 'replacePatchList')) {
            c = c && (isArray(get(bootJ, 'replacePatchList')) && every(get(bootJ, 'replacePatchList'), isString));
        }
        if (c && has(bootJ, 'scriptFileList_preload')) {
            c = c && (isArray(get(bootJ, 'scriptFileList_preload')) && every(get(bootJ, 'scriptFileList_preload'), isString));
        }
        if (c && has(bootJ, 'scriptFileList_earlyload')) {
            c = c && (isArray(get(bootJ, 'scriptFileList_earlyload')) && every(get(bootJ, 'scriptFileList_earlyload'), isString));
        }
        if (c && has(bootJ, 'scriptFileList_inject_early')) {
            c = c && (isArray(get(bootJ, 'scriptFileList_inject_early')) && every(get(bootJ, 'scriptFileList_inject_early'), isString));
        }
        if (!c && log) {
            log.error('validateBootJson(bootJ) failed. ' + JSON.stringify([
                isString(get(bootJ, 'name')),
                get(bootJ, 'name').length > 0,
                isString(get(bootJ, 'version')),
                get(bootJ, 'version').length > 0,
                isArray(get(bootJ, 'styleFileList')),
                every(get(bootJ, 'styleFileList'), isString),
                isArray(get(bootJ, 'scriptFileList')),
                every(get(bootJ, 'scriptFileList'), isString),
                isArray(get(bootJ, 'tweeFileList')),
                every(get(bootJ, 'tweeFileList'), isString),
                isArray(get(bootJ, 'imgFileList')),
                every(get(bootJ, 'imgFileList'), isString),
                // 'nickName',
                // has(bootJ, 'nickName') ? isString(get(bootJ, 'nickName')) : true,
                'alias',
                has(bootJ, 'alias') &&
                    isArray(get(bootJ, 'alias')) ? every(get(bootJ, 'alias'), checkDependenceInfo) : true,
                'dependenceInfo',
                has(bootJ, 'dependenceInfo') &&
                    isArray(get(bootJ, 'dependenceInfo')) ? every(get(bootJ, 'dependenceInfo'), checkDependenceInfo) : true,
                'addonPlugin',
                has(bootJ, 'addonPlugin') &&
                    isArray(get(bootJ, 'addonPlugin')) ? every(get(bootJ, 'addonPlugin'), checkModBootJsonAddonPlugin) : true,
                'replacePatchList',
                has(bootJ, 'replacePatchList') &&
                    isArray(get(bootJ, 'replacePatchList')) ? every(get(bootJ, 'replacePatchList'), isString) : true,
                'scriptFileList_preload',
                has(bootJ, 'scriptFileList_preload') &&
                    isArray(get(bootJ, 'scriptFileList_preload')) ? every(get(bootJ, 'scriptFileList_preload'), isString) : true,
                'scriptFileList_earlyload',
                has(bootJ, 'scriptFileList_earlyload') &&
                    isArray(get(bootJ, 'scriptFileList_earlyload')) ? every(get(bootJ, 'scriptFileList_earlyload'), isString) : true,
                'scriptFileList_inject_early',
                has(bootJ, 'scriptFileList_inject_early') &&
                    isArray(get(bootJ, 'scriptFileList_inject_early')) ? every(get(bootJ, 'scriptFileList_inject_early'), isString) : true,
            ]));
        }
        return c;
    }
    // replaceImgWithBase64String(s: string) {
    //     this.modInfo?.imgs.forEach(T => {
    //         s = s.replace(T.path, T.data);
    //     });
    // }
    async init() {
        var _a;
        await this.modZipReaderHash.init();
        const bootJsonFile = this.zip.file(ModZipReader.modBootFilePath);
        if (!bootJsonFile) {
            console.log('ModLoader ====== ModZipReader init() cannot find :', ModZipReader.modBootFilePath);
            return false;
        }
        const bootJson = await bootJsonFile.async('string');
        const bootJ = JSON5.parse(bootJson);
        // console.log('ModZipReader init() bootJ', bootJ);
        // console.log('ModZipReader init() bootJ', this.validateBootJson(bootJ));
        // console.log('ModZipReader init() bootJ', [
        //     bootJ
        //     , isString(get(bootJ, 'name'))
        //     , get(bootJ, 'name').length > 0
        //     , isString(get(bootJ, 'version'))
        //     , get(bootJ, 'version').length > 0
        //     , isArray(get(bootJ, 'styleFileList'))
        //     , every(get(bootJ, 'styleFileList'), isString)
        //     , isArray(get(bootJ, 'scriptFileList'))
        //     , every(get(bootJ, 'scriptFileList'), isString)
        //     , isArray(get(bootJ, 'tweeFileList'))
        //     , every(get(bootJ, 'tweeFileList'), isString)
        //     , isArray(get(bootJ, 'imgFileList'))
        //     , every(get(bootJ, 'imgFileList'), isString)
        //     , isArray(get(bootJ, 'imgFileReplaceList'))
        //     , every(get(bootJ, 'imgFileReplaceList'), T => isArray(T) && T.length === 2 && isString(T[0]) && isString(T[1]))
        // ]);
        if (ModZipReader.validateBootJson(bootJ, this.log)) {
            this.modInfo = {
                name: bootJ.name,
                nickName: bootJ.nickName || undefined,
                alias: (_a = bootJ.alias) !== null && _a !== void 0 ? _a : [],
                version: bootJ.version,
                cache: new SC2DataInfo(this.log, bootJ.name),
                imgs: [],
                imgFileReplaceList: [],
                scriptFileList_preload: [],
                scriptFileList_earlyload: [],
                scriptFileList_inject_early: [],
                replacePatcher: [],
                bootJson: bootJ,
                modRef: undefined,
            };
            this.loaderBase.addZipFile(bootJ.name, this);
            // console.log('ModLoader ====== ModZipReader init() modInfo', this.modInfo);
            // load file
            // for (const imgRPath of bootJ.imgFileReplaceList) {
            //     const imgFile = this.zip.file(imgRPath[1]);
            //     if (imgFile) {
            //         const data = await imgFile.async('string');
            //         this.modInfo.imgFileReplaceList.push([
            //             imgRPath[0],
            //             data,
            //         ]);
            //     } else {
            //         console.warn('cannot get imgFileReplaceList file from mod zip:', [this.modInfo.name, imgFile])
            //     }
            // }
            for (const replacePatchPath of bootJ.replacePatchList || []) {
                const replacePatchFile = this.zip.file(replacePatchPath);
                if (replacePatchFile) {
                    const data = await replacePatchFile.async('string');
                    try {
                        const d = JSON5.parse(data);
                        if (checkPatchInfo(d)) {
                            this.modInfo.replacePatcher.push(new ReplacePatcher(this.log, this.modInfo.name, replacePatchPath, d));
                        }
                        else {
                            console.error('ModLoader ====== ModZipReader init() replacePatchFile Invalid:', [this.modInfo.name, replacePatchPath]);
                            this.log.error(`ModLoader ====== ModZipReader init() replacePatchFile Invalid: [${this.modInfo.name}] [${replacePatchPath}]`);
                        }
                    }
                    catch (e) {
                        console.error('ModLoader ====== ModZipReader init() replacePatchFile Invalid:', [this.modInfo.name, replacePatchPath]);
                        this.log.error(`ModLoader ====== ModZipReader init() replacePatchFile Invalid: [${this.modInfo.name}] [${replacePatchPath}]`);
                    }
                }
                else {
                    console.warn('cannot get replacePatchFile file from mod zip:', [this.modInfo.name, replacePatchFile]);
                    this.log.warn(`cannot get replacePatchFile file from mod zip: [${this.modInfo.name}] [${replacePatchFile}]`);
                }
            }
            for (const imgPath of bootJ.imgFileList || []) {
                const imgFile = this.zip.file(imgPath);
                if (imgFile) {
                    this.modInfo.imgs.push({
                        // data: imgWrapBase64Url(imgPath, data),
                        getter: new ModImgGetterDefault(bootJ.name, this, imgPath, this.log),
                        path: imgPath,
                    });
                }
                else {
                    console.error('cannot get imgFileList file from mod zip:', [this.modInfo.name, imgPath]);
                    this.log.error(`cannot get imgFileList file from mod zip: [${this.modInfo.name}] [${imgPath}]`);
                }
            }
            await this.constructModInfoCache(bootJ, false);
            // optional
            if (has(bootJ, 'scriptFileList_preload')) {
                for (const scPath of bootJ.scriptFileList_preload) {
                    const scFile = this.zip.file(scPath);
                    if (scFile) {
                        const data = await scFile.async('string');
                        this.modInfo.scriptFileList_preload.push([scPath, data]);
                    }
                    else {
                        console.warn('cannot get scriptFileList_preload file from mod zip:', [this.modInfo.name, scPath]);
                        this.log.warn(`cannot get scriptFileList_preload file from mod zip: [${this.modInfo.name}] [${scPath}]`);
                    }
                }
            }
            if (has(bootJ, 'scriptFileList_earlyload')) {
                for (const scPath of bootJ.scriptFileList_earlyload) {
                    const scFile = this.zip.file(scPath);
                    if (scFile) {
                        const data = await scFile.async('string');
                        this.modInfo.scriptFileList_earlyload.push([scPath, data]);
                    }
                    else {
                        console.warn('cannot get scriptFileList_earlyload file from mod zip:', [this.modInfo.name, scPath]);
                        this.log.warn(`cannot get scriptFileList_earlyload file from mod zip: [${this.modInfo.name}] [${scPath}]`);
                    }
                }
            }
            if (has(bootJ, 'scriptFileList_inject_early')) {
                for (const scPath of bootJ.scriptFileList_inject_early) {
                    const scFile = this.zip.file(scPath);
                    if (scFile) {
                        const data = await scFile.async('string');
                        this.modInfo.scriptFileList_inject_early.push([scPath, data]);
                    }
                    else {
                        console.warn('cannot get scriptFileList_earlyload file from mod zip:', [this.modInfo.name, scPath]);
                        this.log.warn(`cannot get scriptFileList_earlyload file from mod zip: [${this.modInfo.name}] [${scPath}]`);
                    }
                }
            }
            console.log('ModLoader ====== ModZipReader init() modInfo', this.modInfo, this.modZipReaderHash._hash);
            this.log.log(`ModLoader ====== ModZipReader init() modInfo: [${this.modInfo.name}] [${this.modInfo.version}]`);
            return true;
        }
        return false;
    }
    async refillCacheStyleFileItems(styleFileList, keepOld) {
        if (!this.modInfo) {
            console.error('ModLoader ====== ModZipReader refillCacheStyleFileItems() (!this.modInfo).', [this.modInfo]);
            this.log.error(`ModLoader ====== ModZipReader refillCacheStyleFileItems() (!this.modInfo).`);
            return;
        }
        if (!keepOld) {
            this.modInfo.cache.styleFileItems.items = [];
        }
        for (const stylePath of styleFileList || []) {
            const styleFile = this.zip.file(stylePath);
            if (styleFile) {
                const data = await styleFile.async('string');
                // this.replaceImgWithBase64String(data);
                this.modInfo.cache.styleFileItems.items.push({
                    name: stylePath,
                    content: data,
                    id: 0,
                });
            }
            else {
                console.warn('cannot get styleFileList file from mod zip:', [this.modInfo.name, stylePath]);
                this.log.warn(`cannot get styleFileList file from mod zip: [${this.modInfo.name}] [${stylePath}]`);
            }
        }
        this.modInfo.cache.styleFileItems.fillMap();
    }
    async refillCachePassageDataItems(tweeFileList, keepOld) {
        if (!this.modInfo) {
            console.error('ModLoader ====== ModZipReader refillCachePassageDataItems() (!this.modInfo).', [this.modInfo]);
            this.log.error(`ModLoader ====== ModZipReader refillCachePassageDataItems() (!this.modInfo).`);
            return;
        }
        if (!keepOld) {
            this.modInfo.cache.passageDataItems.items = [];
        }
        for (const tweePath of tweeFileList || []) {
            const imgFile = this.zip.file(tweePath);
            if (imgFile) {
                const data = await imgFile.async('string');
                const tp = Twee2Passage(data);
                // console.log('Twee2Passage', tp, [data]);
                for (const p of tp) {
                    // this.replaceImgWithBase64String(p.contect);
                    this.modInfo.cache.passageDataItems.items.push({
                        name: p.name,
                        content: p.contect,
                        id: 0,
                        tags: p.tags,
                    });
                }
                // {
                //     // <<widget "variablesStart2">>
                //     const isWidget = /<<widget\W+"([^ "]+)"\W*>>/.test(data);
                //     this.replaceImgWithBase64String(data);
                //     this.modInfo.cache.passageDataItems.items.push({
                //         name: tweePath,
                //         content: data,
                //         id: 0,
                //         tags: isWidget ? ['widget'] : [],
                //     });
                // }
            }
            else {
                console.error('cannot get tweeFileList file from mod zip:', [this.modInfo.name, tweePath]);
                this.log.error(`cannot get tweeFileList file from mod zip: [${this.modInfo.name}] [${tweePath}]`);
            }
        }
        this.modInfo.cache.passageDataItems.fillMap();
    }
    async refillCacheScriptFileItems(scriptFileList, keepOld) {
        if (!this.modInfo) {
            console.error('ModLoader ====== ModZipReader refillCacheScriptFileItems() (!this.modInfo).', [this.modInfo]);
            this.log.error(`ModLoader ====== ModZipReader refillCacheScriptFileItems() (!this.modInfo).`);
            return;
        }
        if (!keepOld) {
            this.modInfo.cache.scriptFileItems.items = [];
        }
        for (const scPath of scriptFileList || []) {
            const scFile = this.zip.file(scPath);
            if (scFile) {
                const data = await scFile.async('string');
                // this.replaceImgWithBase64String(data);
                this.modInfo.cache.scriptFileItems.items.push({
                    name: scPath,
                    content: data,
                    id: 0,
                });
            }
            else {
                console.error('cannot get scriptFileList file from mod zip:', [this.modInfo.name, scPath]);
                this.log.error(`cannot get scriptFileList file from mod zip: [${this.modInfo.name}] [${scPath}]`);
            }
        }
        this.modInfo.cache.scriptFileItems.fillMap();
    }
    async constructModInfoCache(bootJ, keepOld) {
        if (!this.modInfo) {
            console.error('ModLoader ====== ModZipReader constructModeInfoCache() (!this.modInfo).', [this.modInfo]);
            this.log.error(`ModLoader ====== ModZipReader constructModeInfoCache() (!this.modInfo).`);
            return;
        }
        await this.refillCacheStyleFileItems(bootJ.styleFileList, keepOld);
        await this.refillCachePassageDataItems(bootJ.tweeFileList, keepOld);
        await this.refillCacheScriptFileItems(bootJ.scriptFileList, keepOld);
    }
}
ModZipReader.modBootFilePath = 'boot.json';
export class LoaderBase {
    constructor(log, loaderKeyConfig) {
        this.log = log;
        this.loaderKeyConfig = loaderKeyConfig;
        this.modList = [];
        this.modZipList = new Map();
        this.logger = {
            log: (s) => {
                this.log.logInfo(s);
            },
            warn: (s) => {
                this.log.logWarning(s);
            },
            error: (s) => {
                this.log.logError(s);
            },
        };
    }
    init() {
        // this is used for override
    }
    getZipFile(name) {
        return this.modZipList.get(name);
    }
    addZipFile(name, zip) {
        if (this.modZipList.has(name)) {
            console.warn('ModLoader ====== LoaderBase addZipFile() [warn!!!] duplicate mod name:', name);
            this.log.logWarning(`LoaderBase addZipFile() [warn!!!] duplicate mod name: [${name}]`);
            this.modZipList.get(name).push(zip);
            return;
        }
        this.modZipList.set(name, [zip]);
    }
    async load() {
        throw new Error('LoaderBase load() not implement');
    }
}
export class LocalStorageLoader extends LoaderBase {
    init() {
        super.init();
        LocalStorageLoader.modDataLocalStorageZipList = this.loaderKeyConfig.getLoaderKey(LocalStorageLoader.modDataLocalStorageZipList, LocalStorageLoader.modDataLocalStorageZipList);
        LocalStorageLoader.modDataLocalStorageZipPrefix = this.loaderKeyConfig.getLoaderKey(LocalStorageLoader.modDataLocalStorageZipPrefix, LocalStorageLoader.modDataLocalStorageZipPrefix);
    }
    async load() {
        const listFile = localStorage.getItem(LocalStorageLoader.modDataLocalStorageZipList);
        if (!listFile) {
            return Promise.resolve(false);
        }
        let list;
        try {
            list = JSON5.parse(listFile);
        }
        catch (e) {
            console.error(e);
            return Promise.resolve(false);
        }
        if (!(isArray(list) && list.every(isString))) {
            return Promise.resolve(false);
        }
        console.log('ModLoader ====== LocalStorageLoader load() list', list);
        // this.logger.log('ModLoader ====== LocalStorageLoader load() list');
        // modDataBase64ZipStringList: base64[]
        for (const zipPath of list) {
            const base64ZipString = localStorage.getItem(LocalStorageLoader.calcModNameKey(zipPath));
            if (!base64ZipString) {
                console.error('ModLoader ====== LocalStorageLoader load() cannot get zipPath:', zipPath);
                // this.logger.error(`ModLoader ====== LocalStorageLoader load() cannot get zipPath:[${zipPath}]`);
                continue;
            }
            try {
                const m = await JSZip.loadAsync(base64ZipString, { base64: true }).then(zip => {
                    return new ModZipReader(zip, base64ZipString, this, this.log);
                });
                if (await m.init()) {
                    this.modList.push(m);
                }
            }
            catch (E) {
                console.error(E);
            }
        }
        return Promise.resolve(true);
    }
    static listMod() {
        const ls = localStorage.getItem(this.modDataLocalStorageZipList);
        if (!ls) {
            console.log('ModLoader ====== LocalStorageLoader listMod() cannot find modDataLocalStorageZipList');
            return undefined;
        }
        try {
            const l = JSON5.parse(ls);
            console.log('ModLoader ====== LocalStorageLoader listMod() modDataLocalStorageZipList', l);
            if (Array.isArray(l) && l.every(isString)) {
                return l;
            }
        }
        catch (e) {
            console.error(e);
        }
        console.log('ModLoader ====== LocalStorageLoader listMod() modDataLocalStorageZipList Invalid');
        return undefined;
    }
    static calcModNameKey(name) {
        return `${this.modDataLocalStorageZipPrefix}:${name}`;
    }
    static addMod(name, modBase64String) {
        let l = new Set(this.listMod() || []);
        const k = this.calcModNameKey(name);
        l.add(name);
        localStorage.setItem(k, modBase64String);
        localStorage.setItem(this.modDataLocalStorageZipList, JSON.stringify(Array.from(l)));
    }
    static removeMod(name) {
        let l = this.listMod() || [];
        l = l.filter(T => T !== name);
        const k = this.calcModNameKey(name);
        localStorage.setItem(this.modDataLocalStorageZipList, JSON.stringify(l));
        localStorage.removeItem(k);
    }
    // get bootJson from zip
    static async checkModZipFile(modBase64String) {
        try {
            const zip = await JSZip.loadAsync(modBase64String, { base64: true });
            const bootJsonFile = zip.file(ModZipReader.modBootFilePath);
            if (!bootJsonFile) {
                console.log('ModLoader ====== LocalStorageLoader checkModeZipFile() cannot find bootJsonFile:', ModZipReader.modBootFilePath);
                return `bootJsonFile ${ModZipReader.modBootFilePath} Invalid`;
            }
            const bootJson = await bootJsonFile.async('string');
            const bootJ = JSON5.parse(bootJson);
            if (ModZipReader.validateBootJson(bootJ)) {
                return bootJ;
            }
            return `bootJson Invalid`;
        }
        catch (E) {
            console.error('checkModZipFile', E);
            return Promise.reject(E);
        }
    }
    setConfigKey(modDataLocalStorageZipListKey, modDataLocalStorageZipPrefix) {
        LocalStorageLoader.modDataLocalStorageZipList = modDataLocalStorageZipListKey !== null && modDataLocalStorageZipListKey !== void 0 ? modDataLocalStorageZipListKey : LocalStorageLoader.modDataLocalStorageZipList;
        LocalStorageLoader.modDataLocalStorageZipPrefix = modDataLocalStorageZipPrefix !== null && modDataLocalStorageZipPrefix !== void 0 ? modDataLocalStorageZipPrefix : LocalStorageLoader.modDataLocalStorageZipPrefix;
    }
}
LocalStorageLoader.modDataLocalStorageZipList = 'modDataLocalStorageZipList';
LocalStorageLoader.modDataLocalStorageZipPrefix = 'modDataLocalStorageZip';
export class IndexDBLoader extends LoaderBase {
    init() {
        super.init();
        IndexDBLoader.dbName = this.loaderKeyConfig.getLoaderKey(IndexDBLoader.dbName, IndexDBLoader.dbName);
        IndexDBLoader.storeName = this.loaderKeyConfig.getLoaderKey(IndexDBLoader.storeName, IndexDBLoader.storeName);
        IndexDBLoader.modDataIndexDBZipListHidden = this.loaderKeyConfig.getLoaderKey(IndexDBLoader.modDataIndexDBZipListHidden, IndexDBLoader.modDataIndexDBZipListHidden);
        IndexDBLoader.modDataIndexDBZipList = this.loaderKeyConfig.getLoaderKey(IndexDBLoader.modDataIndexDBZipList, IndexDBLoader.modDataIndexDBZipList);
        IndexDBLoader.modDataIndexDBZipPrefix = this.loaderKeyConfig.getLoaderKey(IndexDBLoader.modDataIndexDBZipPrefix, IndexDBLoader.modDataIndexDBZipPrefix);
        this.customStore = createStore(IndexDBLoader.dbName, IndexDBLoader.storeName);
    }
    constructor(modLoadControllerCallback, loaderKeyConfig) {
        super(modLoadControllerCallback, loaderKeyConfig);
        this.modLoadControllerCallback = modLoadControllerCallback;
        this.loaderKeyConfig = loaderKeyConfig;
    }
    async load() {
        const listFile = await keyval_get(IndexDBLoader.modDataIndexDBZipList, this.customStore);
        if (!listFile) {
            return Promise.resolve(false);
        }
        let list;
        try {
            list = JSON5.parse(listFile);
        }
        catch (e) {
            console.error(e);
            return Promise.resolve(false);
        }
        if (!(isArray(list) && list.every(isString))) {
            return Promise.resolve(false);
        }
        console.log('ModLoader ====== IndexDBLoader load() list', list);
        // modDataBase64ZipStringList: base64[]
        for (const zipPath of list) {
            const base64ZipString = await keyval_get(IndexDBLoader.calcModNameKey(zipPath), this.customStore);
            if (!base64ZipString) {
                console.error('ModLoader ====== IndexDBLoader load() cannot get zipPath:', zipPath);
                continue;
            }
            try {
                const m = await JSZip.loadAsync(base64ZipString, { base64: true }).then(zip => {
                    return new ModZipReader(zip, base64ZipString, this, this.log);
                });
                if (await m.init()) {
                    this.modList.push(m);
                }
            }
            catch (E) {
                console.error(E);
            }
        }
        return Promise.resolve(true);
    }
    /**
     * @param modeList must have same items as the list in listMod()
     */
    static async reorderModList(modeList) {
        const oldList = await IndexDBLoader.listMod();
        if (!oldList) {
            console.error('ModLoader ====== IndexDBLoader reorderModList() oldList Invalid');
            return;
        }
        if (oldList.length !== modeList.length) {
            console.error('ModLoader ====== IndexDBLoader reorderModList() oldList.length !== modeList.length');
            return;
        }
        if (uniq(modeList).length !== modeList.length) {
            console.error('ModLoader ====== IndexDBLoader reorderModList() modeList has duplicate items. invalid');
            return;
        }
        if (!oldList.every((T, i) => modeList.includes(T))) {
            console.error('ModLoader ====== IndexDBLoader reorderModList() oldList !includes() modeList');
            return;
        }
        await keyval_set(IndexDBLoader.modDataIndexDBZipList, JSON.stringify(modeList), createStore(IndexDBLoader.dbName, IndexDBLoader.storeName));
        console.log('ModLoader ====== IndexDBLoader reorderModList() done');
    }
    static async setModList(modeList) {
        if (!isArray(modeList) || !every(modeList, isString)) {
            console.error('ModLoader ====== IndexDBLoader setModList() modeList type invalid. invalid');
            return;
        }
        if (uniq(modeList).length !== modeList.length) {
            console.error('ModLoader ====== IndexDBLoader setModList() modeList has duplicate items. invalid');
            return;
        }
        console.log('[ModLoader] IndexDBLoader setModList() modDataIndexDBZipList', IndexDBLoader.modDataIndexDBZipList);
        console.log('[ModLoader] IndexDBLoader setModList() dbName', IndexDBLoader.dbName);
        console.log('[ModLoader] IndexDBLoader setModList() storeName', IndexDBLoader.storeName);
        await keyval_set(IndexDBLoader.modDataIndexDBZipList, JSON.stringify(modeList), createStore(IndexDBLoader.dbName, IndexDBLoader.storeName));
        console.log('ModLoader ====== IndexDBLoader setModList() done');
    }
    static async setHiddenModList(modeList) {
        if (!isArray(modeList) || !every(modeList, isString)) {
            console.error('ModLoader ====== IndexDBLoader setHiddenModList() modeList type invalid. invalid');
            return;
        }
        if (uniq(modeList).length !== modeList.length) {
            console.error('ModLoader ====== IndexDBLoader setHiddenModList() modeList has duplicate items. invalid');
            return;
        }
        console.log('[ModLoader] IndexDBLoader setHiddenModList() modDataIndexDBZipListHidden', IndexDBLoader.modDataIndexDBZipListHidden);
        console.log('[ModLoader] IndexDBLoader setHiddenModList() dbName', IndexDBLoader.dbName);
        console.log('[ModLoader] IndexDBLoader setHiddenModList() storeName', IndexDBLoader.storeName);
        await keyval_set(IndexDBLoader.modDataIndexDBZipListHidden, JSON.stringify(modeList), createStore(IndexDBLoader.dbName, IndexDBLoader.storeName));
        console.log('ModLoader ====== IndexDBLoader setHiddenModList() done');
    }
    static async loadHiddenModList() {
        console.log('[ModLoader] IndexDBLoader loadHiddenModList() modDataIndexDBZipListHidden', IndexDBLoader.modDataIndexDBZipListHidden);
        console.log('[ModLoader] IndexDBLoader loadHiddenModList() dbName', IndexDBLoader.dbName);
        console.log('[ModLoader] IndexDBLoader loadHiddenModList() storeName', IndexDBLoader.storeName);
        const ls = await keyval_get(IndexDBLoader.modDataIndexDBZipListHidden, createStore(IndexDBLoader.dbName, IndexDBLoader.storeName));
        if (!ls) {
            console.log('ModLoader ====== IndexDBLoader loadHiddenModList() cannot find modDataIndexDBZipListHidden');
            return undefined;
        }
        try {
            const l = JSON5.parse(ls);
            console.log('ModLoader ====== IndexDBLoader loadHiddenModList() modDataIndexDBZipListHidden', l);
            if (Array.isArray(l) && l.every(isString)) {
                return l;
            }
        }
        catch (e) {
            console.error(e);
        }
        console.log('ModLoader ====== IndexDBLoader loadHiddenModList() modDataIndexDBZipListHidden Invalid');
        return undefined;
    }
    static async listMod() {
        console.log('[ModLoader] IndexDBLoader listMod() modDataIndexDBZipList', IndexDBLoader.modDataIndexDBZipList);
        console.log('[ModLoader] IndexDBLoader listMod() dbName', IndexDBLoader.dbName);
        console.log('[ModLoader] IndexDBLoader listMod() storeName', IndexDBLoader.storeName);
        const ls = await keyval_get(IndexDBLoader.modDataIndexDBZipList, createStore(IndexDBLoader.dbName, IndexDBLoader.storeName));
        if (!ls) {
            console.log('ModLoader ====== IndexDBLoader listMod() cannot find modDataIndexDBZipList');
            return undefined;
        }
        try {
            const l = JSON5.parse(ls);
            console.log('ModLoader ====== IndexDBLoader listMod() modDataIndexDBZipList', l);
            if (Array.isArray(l) && l.every(isString)) {
                return l;
            }
        }
        catch (e) {
            console.error(e);
        }
        console.log('ModLoader ====== IndexDBLoader listMod() modDataIndexDBZipList Invalid');
        return undefined;
    }
    static calcModNameKey(name) {
        return `${this.modDataIndexDBZipPrefix}:${name}`;
    }
    static async addMod(name, modBase64String) {
        let l = new Set(await this.listMod() || []);
        const k = this.calcModNameKey(name);
        l.add(name);
        const db = createStore(IndexDBLoader.dbName, IndexDBLoader.storeName);
        await setMany([
            [k, modBase64String],
            [this.modDataIndexDBZipList, JSON.stringify(Array.from(l))],
        ], db);
        // await keyval_set(k, modBase64String, db);
        // await keyval_set(this.modDataIndexDBZipList, JSON.stringify(Array.from(l)), db);
    }
    static async removeMod(name) {
        let l = await this.listMod() || [];
        l = l.filter(T => T !== name);
        let lH = await this.loadHiddenModList() || [];
        lH = lH.filter(T => T !== name);
        const db = createStore(IndexDBLoader.dbName, IndexDBLoader.storeName);
        const k = this.calcModNameKey(name);
        await keyval_set(this.modDataIndexDBZipList, JSON.stringify(l), db);
        await keyval_set(this.modDataIndexDBZipListHidden, JSON.stringify(lH), db);
        await keyval_del(k, db);
    }
    // get bootJson from zip
    static async checkModZipFile(modBase64String) {
        try {
            const zip = await JSZip.loadAsync(modBase64String, { base64: true });
            const bootJsonFile = zip.file(ModZipReader.modBootFilePath);
            if (!bootJsonFile) {
                console.log('ModLoader ====== IndexDBLoader checkModeZipFile() cannot find bootJsonFile:', ModZipReader.modBootFilePath);
                return `bootJsonFile ${ModZipReader.modBootFilePath} Invalid`;
            }
            const bootJson = await bootJsonFile.async('string');
            const bootJ = JSON5.parse(bootJson);
            if (ModZipReader.validateBootJson(bootJ)) {
                return bootJ;
            }
            return `bootJson Invalid`;
        }
        catch (E) {
            console.error('checkModZipFile', E);
            return Promise.reject(E);
        }
    }
    setConfigKey(dbName, storeName, modDataIndexDBZipList, modDataIndexDBZipListHidden) {
        IndexDBLoader.dbName = dbName !== null && dbName !== void 0 ? dbName : IndexDBLoader.dbName;
        IndexDBLoader.storeName = storeName !== null && storeName !== void 0 ? storeName : IndexDBLoader.storeName;
        IndexDBLoader.modDataIndexDBZipList = modDataIndexDBZipList !== null && modDataIndexDBZipList !== void 0 ? modDataIndexDBZipList : IndexDBLoader.modDataIndexDBZipList;
        IndexDBLoader.modDataIndexDBZipListHidden = modDataIndexDBZipListHidden !== null && modDataIndexDBZipListHidden !== void 0 ? modDataIndexDBZipListHidden : IndexDBLoader.modDataIndexDBZipListHidden;
    }
}
IndexDBLoader.dbName = 'ModLoader_IndexDBLoader';
IndexDBLoader.storeName = 'ModLoader_IndexDBLoader';
IndexDBLoader.modDataIndexDBZipListHidden = 'modDataIndexDBZipListHidden';
IndexDBLoader.modDataIndexDBZipList = 'modDataIndexDBZipList';
IndexDBLoader.modDataIndexDBZipPrefix = 'modDataIndexDBZip';
export class Base64ZipStringLoader extends LoaderBase {
    constructor(modLoadControllerCallback, loaderKeyConfig, 
    // base64ZipStringList: base64[]
    base64ZipStringList) {
        super(modLoadControllerCallback, loaderKeyConfig);
        this.modLoadControllerCallback = modLoadControllerCallback;
        this.loaderKeyConfig = loaderKeyConfig;
        this.base64ZipStringList = base64ZipStringList;
    }
    async load() {
        // modDataBase64ZipStringList: base64[]
        for (const base64ZipString of this.base64ZipStringList) {
            try {
                const m = await JSZip.loadAsync(base64ZipString, { base64: true }).then(zip => {
                    return new ModZipReader(zip, base64ZipString, this, this.log);
                });
                if (await m.init()) {
                    this.modList.push(m);
                }
            }
            catch (E) {
                console.error(E);
            }
        }
        return Promise.resolve(true);
    }
}
export class LocalLoader extends LoaderBase {
    init() {
        super.init();
        this.modDataValueZipListPath = this.loaderKeyConfig.getLoaderKey(this.modDataValueZipListPath, this.modDataValueZipListPath);
    }
    constructor(modLoadControllerCallback, loaderKeyConfig, thisWin) {
        super(modLoadControllerCallback, loaderKeyConfig);
        this.modLoadControllerCallback = modLoadControllerCallback;
        this.loaderKeyConfig = loaderKeyConfig;
        this.thisWin = thisWin;
        this.modDataValueZipListPath = 'modDataValueZipList';
    }
    async load() {
        if (this.thisWin[this.modDataValueZipListPath]) {
            console.log('ModLoader ====== LocalLoader load() DataValueZip', [this.thisWin[this.modDataValueZipListPath]]);
            const modDataValueZipList = this.thisWin[this.modDataValueZipListPath];
            if (modDataValueZipList && isArray(modDataValueZipList) && modDataValueZipList.every(isString)) {
                // modDataValueZipList: base64[]
                for (const modDataValueZip of modDataValueZipList) {
                    try {
                        const m = await JSZip.loadAsync(modDataValueZip, { base64: true }).then(zip => {
                            return new ModZipReader(zip, modDataValueZip, this, this.log);
                        });
                        if (await m.init()) {
                            this.modList.push(m);
                        }
                    }
                    catch (E) {
                        console.error(E);
                    }
                }
                return Promise.resolve(true);
            }
        }
        return Promise.resolve(false);
    }
    setConfigKey(modDataValueZipListPath) {
        this.modDataValueZipListPath = modDataValueZipListPath !== null && modDataValueZipListPath !== void 0 ? modDataValueZipListPath : this.modDataValueZipListPath;
    }
}
export class RemoteLoader extends LoaderBase {
    constructor() {
        super(...arguments);
        this.modDataRemoteListPath = 'modList.json';
    }
    init() {
        super.init();
        this.modDataRemoteListPath = this.loaderKeyConfig.getLoaderKey(this.modDataRemoteListPath, this.modDataRemoteListPath);
    }
    async load() {
        const modList = await fetch(this.modDataRemoteListPath).then(T => T.json()).catch(E => {
            console.error(E);
            return undefined;
        });
        console.log('ModLoader ====== RemoteLoader load() modList', modList);
        if (modList && isArray(modList) && modList.every(isString)) {
            // modList: filePath[]
            for (const modFileZipPath of modList) {
                try {
                    const m = await fetch(modFileZipPath)
                        .then(async (T) => {
                        const blob = await T.blob();
                        const base64ZipString = await blobToBase64(blob);
                        const zipFile = await JSZip.loadAsync(blob);
                        return new ModZipReader(zipFile, base64ZipString, this, this.log);
                    });
                    if (await m.init()) {
                        this.modList.push(m);
                    }
                }
                catch (E) {
                    console.error(E);
                }
            }
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    setConfigKey(modDataRemoteListPath) {
        this.modDataRemoteListPath = modDataRemoteListPath;
    }
}
export class LazyLoader extends LoaderBase {
    async add(modeZip) {
        try {
            const base64ZipString = await modeZip.generateAsync({ type: "base64" });
            const m = new ModZipReader(modeZip, base64ZipString, this, this.log);
            if (await m.init()) {
                this.modList.push(m);
            }
            return m;
        }
        catch (E) {
            console.error('LazyLoader add()', E);
            this.log.logError(`LazyLoader add() [${(E === null || E === void 0 ? void 0 : E.message) ? E.message : E}]`);
            return Promise.reject(E);
        }
    }
    async load() {
        return Promise.resolve(true);
    }
}
export const getModZipReaderStaticClassRef = () => {
    console.error('WARNING: the [[[getModZipReaderStaticClassRef]]] will delete later.');
    return {
        LocalStorageLoader: LocalStorageLoader,
        IndexDBLoader: IndexDBLoader,
        LocalLoader: LocalLoader,
        RemoteLoader: RemoteLoader,
    };
};
export class LoaderKeyConfig {
    constructor(log) {
        this.log = log;
        this.modLoaderKeyConfigWinHookFunctionName = 'modLoaderKeyConfigWinHookFunction';
        this.config = new Map();
        this.isInit = false;
        this.logger = {
            log: (s) => {
                this.log.logInfo(s);
            },
            warn: (s) => {
                this.log.logWarning(s);
            },
            error: (s) => {
                this.log.logError(s);
            },
        };
    }
    getLoaderKey(k, d) {
        this.init();
        const n = this.config.get(k);
        console.log('LoaderKeyConfig getLoaderKey state:', k, d, n);
        if (isString(n) && n.length > 1) {
            console.log('LoaderKeyConfig getLoaderKey return:', k, n);
            return n;
        }
        else {
            console.log('LoaderKeyConfig getLoaderKey return:', k, d);
            return d;
        }
    }
    init() {
        if (this.isInit) {
            return;
        }
        this.isInit = true;
        console.log('LoaderKeyConfig init.');
        this.callWinHookFunction();
        this.getConfigFromUrlHash();
        if (this.config.size > 0) {
            this.logger.log(`LoaderKeyConfig init() config:[${[...this.config.entries()]}]`);
        }
        console.log('LoaderKeyConfig init end', this.config);
    }
    /**
     * @example
     * @code
     * ```
     * window.modLoaderKeyConfigWinHookFunction = (loaderKeyConfig: LoaderKeyConfig) => {
     *    loaderKeyConfig.config.set('modDataIndexDBZipList', 'modDataIndexDBZipList123456789');
     * };
     * ```
     *
     * @protected
     */
    callWinHookFunction() {
        try {
            if (window[this.modLoaderKeyConfigWinHookFunctionName]) {
                window[this.modLoaderKeyConfigWinHookFunctionName](this);
                console.log('LoaderKeyConfig callWinHookFunction called', this.config);
            }
        }
        catch (e) {
            console.error('LoaderKeyConfig callWinHookFunction Error', e);
            this.logger.error('LoaderKeyConfig callWinHookFunction Error');
        }
    }
    /**
     * @example   URL:  ./Degrees of Lewdity VERSION.html.mod.html?modDataIndexDBZipList=modDataIndexDBZipList123456789
     * @protected
     */
    getConfigFromUrlHash() {
        const search = window.location.search;
        if (search.length > 1) {
            const a = search.slice(1).split('&').map(T => T.split('='));
            for (const [k, v] of a) {
                this.config.set(k, v);
            }
        }
    }
}
//# sourceMappingURL=ModZipReader.js.map