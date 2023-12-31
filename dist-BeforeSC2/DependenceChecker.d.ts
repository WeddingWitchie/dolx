import { SC2DataManager } from "SC2DataManager";
import { ModUtils } from "./Utils";
import { ModInfo } from "./ModLoader";
import { LogWrapper } from "./ModLoadController";
import { ModOrderContainer } from "./ModOrderContainer";
export declare class InfiniteSemVerApi {
    parseRange: typeof import("./SemVer/InfiniteSemVer").parseVersionRange;
    parseVersion: typeof import("./SemVer/InfiniteSemVer").parseInfiniteSemVer;
    satisfies: typeof import("./SemVer/InfiniteSemVer").isWithinRange;
}
export declare class DependenceChecker {
    gSC2DataManager: SC2DataManager;
    gModUtils: ModUtils;
    log: LogWrapper;
    constructor(gSC2DataManager: SC2DataManager, gModUtils: ModUtils);
    getInfiniteSemVerApi(): InfiniteSemVerApi;
    checkFor(mod: ModInfo, modCaches: ModOrderContainer[]): boolean;
    check(): boolean;
    /**
     * this called by mod `CheckGameVersion`
     * because the game version only can get after game loaded
     * @param gameVersion
     */
    checkGameVersion(gameVersion: string): boolean;
}
//# sourceMappingURL=DependenceChecker.d.ts.map