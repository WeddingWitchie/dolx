import { isString, isArray, every } from 'lodash';
function checkPatchInfoItem(o) {
    return o
        && isString(o.from)
        && isString(o.to)
        && isString(o.fileName);
}
function checkPatchInfoItemPassage(o) {
    return o
        && isString(o.from)
        && isString(o.to)
        // && isString(o.fileName)
        && isString(o.passageName);
}
export function checkPatchInfo(o) {
    return o
        && (o.js ? (isArray(o.js) && every(o.js, checkPatchInfoItem)) : true)
        && (o.css ? (isArray(o.css) && every(o.css, checkPatchInfoItem)) : true)
        && (o.twee ? (isArray(o.twee) && every(o.twee, checkPatchInfoItemPassage)) : true);
}
function ModI18NTypeB_escapedPatternString(pattern) {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function replaceAndRecordPositions(s, from, to) {
    let positions = [];
    let r = s.replace(from, (match, offset) => {
        positions.push(offset);
        return to;
    });
    return {
        r: r,
        positions: positions
    };
}
function tryReplaceStringFuzzyWithHint(s, v, passageNameOrFileName) {
    // first , we try to match and replace with const string in +-2 , this is the fastest way
    if (s.substring(v.pos, v.pos + v.from.length) === v.from) {
        s = s.substring(0, v.pos) + v.to + s.substring(v.pos + v.from.length);
    }
    else if (s.substring(v.pos - 1, v.pos + v.from.length - 1) === v.from) {
        s = s.substring(0, v.pos - 1) + v.to + s.substring(v.pos - 1 + v.from.length);
    }
    else if (s.substring(v.pos - 2, v.pos + v.from.length - 2) === v.from) {
        s = s.substring(0, v.pos - 2) + v.to + s.substring(v.pos - 2 + v.from.length);
    }
    else if (s.substring(v.pos + 1, v.pos + v.from.length + 1) === v.from) {
        s = s.substring(0, v.pos + 1) + v.to + s.substring(v.pos + 1 + v.from.length);
    }
    else if (s.substring(v.pos + 2, v.pos + v.from.length + 2) === v.from) {
        s = s.substring(0, v.pos + 2) + v.to + s.substring(v.pos + 2 + v.from.length);
    }
    else {
        // otherwise , we try to match and replace with fuzzy match in [-10~+30]
        try {
            let re = new RegExp(ModI18NTypeB_escapedPatternString(v.from), '');
            // re.lastIndex = v.pos;
            const startPos = Math.max(0, v.pos - 10);
            const endPos = Math.min(s.length, v.pos + v.from.length + 30);
            const mm = re.exec(s.substring(startPos, endPos));
            if (mm) {
                const pStart = startPos + mm.index;
                const pEnd = pStart + v.from.length;
                s = s.substring(0, pStart) + v.to + s.substring(pEnd);
            }
            else {
                console.error('tryReplaceStringFuzzyWithHint cannot find: ', [v.from], ' in ', [passageNameOrFileName], ' at ', [v.pos], ' in ', [s.substring(v.pos - 10, v.pos + v.from.length + 10)]);
            }
            re = undefined;
        }
        catch (e) {
            console.error(e);
            console.error('tryReplaceStringFuzzyWithHint cannot find with error: ', [v.from], ' in ', [passageNameOrFileName], ' at ', [v.pos], ' in ', [s.substring(v.pos - 10, v.pos + v.from.length + 10)]);
        }
    }
    return s;
}
export class ReplacePatcher {
    constructor(logger, modName, patchFileName, patchInfo_) {
        this.logger = logger;
        this.modName = modName;
        this.patchFileName = patchFileName;
        this.patchInfo_ = patchInfo_;
        if (!checkPatchInfo(patchInfo_)) {
            console.error('ReplacePatcher() invalid patchInfo', [modName, patchInfo_]);
            this.patchInfo = {};
        }
        else {
            this.patchInfo = patchInfo_;
        }
        this.patchInfoMap = {
            js: new Map(),
            css: new Map(),
            twee: new Map(),
        };
        if (this.patchInfo.js) {
            for (const T of this.patchInfo.js) {
                if (!this.patchInfoMap.js.has(T.fileName)) {
                    this.patchInfoMap.js.set(T.fileName, []);
                }
                this.patchInfoMap.js.get(T.fileName).push(T);
            }
        }
        if (this.patchInfo.css) {
            for (const T of this.patchInfo.css) {
                if (!this.patchInfoMap.css.has(T.fileName)) {
                    this.patchInfoMap.css.set(T.fileName, []);
                }
                this.patchInfoMap.css.get(T.fileName).push(T);
            }
        }
        if (this.patchInfo.twee) {
            for (const T of this.patchInfo.twee) {
                if (!T.passageName) {
                    // never go there
                    console.error('ReplacePatcher() invalid patchInfo.twee passageName', [modName, patchInfo_, T]);
                    continue;
                }
                if (!this.patchInfoMap.twee.has(T.passageName)) {
                    this.patchInfoMap.twee.set(T.passageName, []);
                }
                this.patchInfoMap.twee.get(T.passageName).push(T);
            }
        }
    }
    applyReplacePatcher(modSC2DataInfoCache) {
        for (const item of modSC2DataInfoCache.scriptFileItems.items) {
            const patchInfoItems = this.patchInfoMap.js.get(item.name);
            if (!patchInfoItems) {
                continue;
            }
            let s = item.content;
            for (const patchInfoItem of patchInfoItems) {
                // s = s.replace(patchInfoItem.from, patchInfoItem.to);
                const r = replaceAndRecordPositions(s, patchInfoItem.from, patchInfoItem.to);
                s = r.r;
                if (r.positions.length > 1) {
                    console.warn('applyReplacePatcher() js replace multiple: ', ' in ', [item.name], ' of ', [patchInfoItem.from], ' to ', [patchInfoItem.to], ' positions ', [r.positions], ' content ', [item.content]);
                    this.logger.warn(`applyReplacePatcher() js replace multiple:` +
                        ` in [${item.name}] of [${patchInfoItem.from}]` +
                        ` positions [${r.positions}]`);
                }
                else if (r.positions.length === 0) {
                    console.warn('applyReplacePatcher() js replace 0: ', ' in ', [item.name], ' of ', [patchInfoItem.from], ' to ', [patchInfoItem.to], ' positions ', [r.positions], ' content ', [item.content]);
                    this.logger.warn(`applyReplacePatcher() js replace 0:` +
                        ` in [${item.name}] of [${patchInfoItem.from}]` +
                        ` positions [${r.positions}]`);
                }
            }
            item.content = s;
        }
        for (const item of modSC2DataInfoCache.styleFileItems.items) {
            const patchInfoItems = this.patchInfoMap.css.get(item.name);
            if (!patchInfoItems) {
                continue;
            }
            let s = item.content;
            for (const patchInfoItem of patchInfoItems) {
                // s = s.replace(patchInfoItem.from, patchInfoItem.to);
                const r = replaceAndRecordPositions(s, patchInfoItem.from, patchInfoItem.to);
                s = r.r;
                if (r.positions.length > 1) {
                    console.warn('applyReplacePatcher() css replace multiple: ', ' in ', [item.name], ' of ', [patchInfoItem.from], ' to ', [patchInfoItem.to], ' positions ', [r.positions], ' content ', [item.content]);
                    this.logger.warn(`applyReplacePatcher() css replace multiple:` +
                        ` in [${item.name}] of [${patchInfoItem.from}]` +
                        ` positions [${r.positions}]`);
                }
                else if (r.positions.length === 0) {
                    console.warn('applyReplacePatcher() css replace 0: ', ' in ', [item.name], ' of ', [patchInfoItem.from], ' to ', [patchInfoItem.to], ' positions ', [r.positions], ' content ', [item.content]);
                    this.logger.warn(`applyReplacePatcher() css replace 0:` +
                        ` in [${item.name}] of [${patchInfoItem.from}]` +
                        ` positions [${r.positions}]`);
                }
            }
            item.content = s;
        }
        for (const item of modSC2DataInfoCache.passageDataItems.items) {
            const patchInfoItems = this.patchInfoMap.twee.get(item.name);
            if (!patchInfoItems) {
                continue;
            }
            let s = item.content;
            for (const patchInfoItem of patchInfoItems) {
                // s = s.replace(patchInfoItem.from, patchInfoItem.to);
                const r = replaceAndRecordPositions(s, patchInfoItem.from, patchInfoItem.to);
                s = r.r;
                if (r.positions.length > 1) {
                    console.warn('applyReplacePatcher() passage replace multiple: ', ' in ', [item.name], ' of ', [patchInfoItem.from], ' to ', [patchInfoItem.to], ' positions ', [r.positions], ' content ', [item.content]);
                    this.logger.warn(`applyReplacePatcher() passage replace multiple:` +
                        ` in [${item.name}] of [${patchInfoItem.from}]` +
                        ` positions [${r.positions}]`);
                }
                else if (r.positions.length === 0) {
                    console.warn('applyReplacePatcher() passage replace 0: ', ' in ', [item.name], ' of ', [patchInfoItem.from], ' to ', [patchInfoItem.to], ' positions ', [r.positions], ' content ', [item.content]);
                    this.logger.warn(`applyReplacePatcher() passage replace 0:` +
                        ` in [${item.name}] of [${patchInfoItem.from}]` +
                        ` positions [${r.positions}]`);
                }
            }
            item.content = s;
        }
    }
}
//# sourceMappingURL=ReplacePatcher.js.map