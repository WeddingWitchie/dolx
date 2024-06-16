export class AddonPlugin {
    constructor(modName, addonName, hookPoint) {
        this.modName = modName;
        this.addonName = addonName;
        this.hookPoint = hookPoint;
    }
}
export class AddonPluginManager {
    constructor(gSC2DataManager, gModLoadController) {
        this.gSC2DataManager = gSC2DataManager;
        this.gModLoadController = gModLoadController;
        this.addonPluginTable = [];
        this.log = gModLoadController.getLog();
        this.passageTracer = this.gSC2DataManager.getPassageTracer();
        // this.passageTracer.addCallback((passageName) => {
        //     switch (passageName) {
        //         case 'Start':
        //             break;
        //         default:
        //             break;
        //     }
        // });
        this.sc2EventTracer = this.gSC2DataManager.getSc2EventTracer();
        this.sc2EventTracer.addCallback(this);
    }
    /**
     * inner use
     */
    async whenSC2StoryReady() {
        await this.triggerHookWhenSC2('whenSC2StoryReady');
    }
    /**
     * inner use
     */
    async whenSC2PassageInit(passage) {
        await this.triggerHookWhenSC2('whenSC2PassageInit', passage);
    }
    /**
     * inner use
     */
    async whenSC2PassageStart(passage, content) {
        await this.triggerHookWhenSC2('whenSC2PassageStart', passage, content);
    }
    /**
     * inner use
     */
    async whenSC2PassageRender(passage, content) {
        await this.triggerHookWhenSC2('whenSC2PassageRender', passage, content);
    }
    /**
     * inner use
     */
    async whenSC2PassageDisplay(passage, content) {
        await this.triggerHookWhenSC2('whenSC2PassageDisplay', passage, content);
    }
    /**
     * inner use
     */
    async whenSC2PassageEnd(passage, content) {
        await this.triggerHookWhenSC2('whenSC2PassageEnd', passage, content);
    }
    /**
     * call by ModLoader (inner use)
     *
     * register a mod to addon plugin, after all mod loaded and after EarlyLoad executed.
     *
     * @param mod
     * @param modZip
     */
    async registerMod2Addon(mod, modZip) {
        if (mod.bootJson.addonPlugin) {
            for (const p of mod.bootJson.addonPlugin) {
                const ad = this.addonPluginTable.find((a) => {
                    return a.modName === p.modName && a.addonName === p.addonName;
                });
                if (!ad) {
                    console.error('ModLoader ====== AddonPluginManager.registerMod() not found', [p, mod]);
                    this.log.error(`AddonPluginManager.registerMod() not found [${p.modName}] [${p.addonName}] on mod[${mod.name}]`);
                    continue;
                }
                if (!ad.hookPoint.registerMod) {
                    // never go there
                    console.error('AddonPluginManager.registerMod() registerMod invalid', [p, mod]);
                    this.log.error(`AddonPluginManager.registerMod() registerMod invalid [${p.modName}] [${p.addonName}] on mod[${mod.name}]`);
                    continue;
                }
                console.log('ModLoader ====== AddonPluginManager.registerMod() registerMod start', [p, mod]);
                this.log.log(`AddonPluginManager.registerMod() registerMod start: to addon [${p.modName}] [${p.addonName}] on mod[${mod.name}]`);
                try {
                    await ad.hookPoint.registerMod(p.addonName, mod, modZip);
                }
                catch (e) {
                    console.error('ModLoader ====== AddonPluginManager.registerMod() registerMod error', [p, mod, e]);
                    this.log.error(`AddonPluginManager.registerMod() registerMod error: to addon [${p.modName}] [${p.addonName}] on mod[${mod.name}] [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
                }
                console.log('ModLoader ====== AddonPluginManager.registerMod() registerMod end', [p, mod]);
                this.log.log(`AddonPluginManager.registerMod() registerMod end: to addon [${p.modName}] [${p.addonName}] on mod[${mod.name}]`);
            }
        }
    }
    /**
     * call by ModLoaderGui (inner use)
     * @param zip
     */
    async exportDataZip(zip) {
        for (const addonPlugin of this.addonPluginTable) {
            if (addonPlugin.hookPoint.exportDataZip) {
                try {
                    zip = await addonPlugin.hookPoint.exportDataZip(zip);
                }
                catch (e) {
                    console.error('exportDataZip error on addonPlugin.hookPoint', [addonPlugin], e);
                    this.log.error(`exportDataZip error on addonPlugin.hookPoint [${addonPlugin.modName}] [${addonPlugin.addonName}] [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
                }
            }
        }
        return zip;
    }
    /**
     * call by ModLoader (inner use)
     * @param hook
     */
    async triggerHook(hook) {
        const log = this.gSC2DataManager.getModLoadController().getLog();
        for (const addonPlugin of this.addonPluginTable) {
            if (addonPlugin.hookPoint[hook]) {
                console.log(`ModLoader ====== AddonPluginManager.triggerHook() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] start`);
                log.log(`AddonPluginManager.triggerHook() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] start`);
                try {
                    await addonPlugin.hookPoint[hook]();
                }
                catch (e) {
                    console.error(`ModLoader ====== AddonPluginManager.triggerHook() error [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] `, e);
                    log.error(`AddonPluginManager.triggerHook() error [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
                }
                console.log(`ModLoader ====== AddonPluginManager.triggerHook() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] end`);
                log.log(`AddonPluginManager.triggerHook() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] end`);
            }
        }
    }
    /**
     * call by ModLoader (inner use)
     */
    async triggerHookWhenSC2(hook, ...params) {
        const log = this.gSC2DataManager.getModLoadController().getLog();
        for (const addonPlugin of this.addonPluginTable) {
            if (addonPlugin.hookPoint[hook]) {
                // console.log(`ModLoader ====== AddonPluginManager.triggerHookWhenSC2() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] start`);
                // log.log(`AddonPluginManager.triggerHookWhenSC2() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] start`);
                try {
                    const f = addonPlugin.hookPoint[hook];
                    await f.call(addonPlugin.hookPoint, ...params);
                }
                catch (e) {
                    console.error(`ModLoader ====== AddonPluginManager.triggerHookWhenSC2() error [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] `, e);
                    log.error(`AddonPluginManager.triggerHookWhenSC2() error [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] [${(e === null || e === void 0 ? void 0 : e.message) ? e.message : e}]`);
                }
                // console.log(`ModLoader ====== AddonPluginManager.triggerHookWhenSC2() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] end`);
                // log.log(`AddonPluginManager.triggerHookWhenSC2() trigger hook [${addonPlugin.modName}] [${addonPlugin.addonName}] [${hook}] end`);
            }
        }
    }
    /**
     * check if a addon plugin is duplicate
     * @param modName
     * @param addonName
     */
    checkDuplicate(modName, addonName) {
        return !!this.addonPluginTable.find((addonPlugin) => {
            return addonPlugin.modName === modName && addonPlugin.addonName === addonName;
        });
    }
    /**
     * register a addon plugin, call by addon plugin,
     * this call must be done when InjectEarlyLoad.
     *
     * 注册一个 addon plugin，由 addon plugin 调用，必须在 InjectEarlyLoad 时调用此函数注册 Addon。
     * @param modName    addon plugin's mod name
     * @param addonName  addon plugin's name
     * @param hookPoint  addon plugin's hook point
     */
    registerAddonPlugin(modName, addonName, hookPoint) {
        if (this.checkDuplicate(modName, addonName)) {
            console.error('ModLoader ====== AddonPluginManager.registerAddonPlugin() duplicate', [modName, addonName]);
            this.log.error(`AddonPluginManager.registerAddonPlugin() duplicate [${modName}] [${addonName}]`);
        }
        console.log('ModLoader ====== AddonPluginManager.registerAddonPlugin() ', [modName, addonName]);
        this.log.log(`AddonPluginManager.registerAddonPlugin() [${modName}] [${addonName}]`);
        this.addonPluginTable.push(new AddonPlugin(modName, addonName, hookPoint));
    }
    /**
     * get a addon plugin, call by mod
     *
     * 获取一个 addon plugin，由 mod 调用。 mod 可以读取 addon plugin 的 hookPoint 来调用 addon plugin 的 API
     * @param modName    addon plugin's mod name
     * @param addonName  addon plugin's name
     */
    getAddonPlugin(modName, addonName) {
        var _a;
        return (_a = this.addonPluginTable.find((addonPlugin) => {
            return addonPlugin.modName === modName && addonPlugin.addonName === addonName;
        })) === null || _a === void 0 ? void 0 : _a.hookPoint;
    }
}
//# sourceMappingURL=AddonPlugin.js.map