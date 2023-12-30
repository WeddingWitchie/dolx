import { cloneDeep } from "lodash";
// input ok set, output ok(new) set and conflict(overflow) set
// the a set will be modified(update)
export function simulateMergeStep(a, b) {
    const r = {
        ok: a,
        conflict: new Set(),
    };
    for (const item of b) {
        if (r.ok.has(item)) {
            r.conflict.add(item);
        }
        else {
            r.ok.add(item);
        }
    }
    return r;
}
export function simulateMergeSC2DataInfoCache(...ic) {
    if (ic.length === 0) {
        throw new Error('simulateMergeSC2DataInfoCache (ic.length === 0)');
    }
    const ooo = ic[0];
    const createResult = (c) => {
        return {
            styleFileItems: {
                ok: new Set(c.styleFileItems.map.keys()),
                conflict: new Set(),
            },
            scriptFileItems: {
                ok: new Set(c.scriptFileItems.map.keys()),
                conflict: new Set(),
            },
            passageDataItems: {
                ok: new Set(c.passageDataItems.map.keys()),
                conflict: new Set(),
            },
            dataSource: c.dataSource,
        };
    };
    const temp = createResult(ooo);
    const r = [];
    for (let i = 1; i < ic.length; i++) {
        const c = ic[i];
        const t = createResult(c);
        t.styleFileItems = simulateMergeStep(temp.styleFileItems.ok, t.styleFileItems.ok);
        t.scriptFileItems = simulateMergeStep(temp.scriptFileItems.ok, t.scriptFileItems.ok);
        t.passageDataItems = simulateMergeStep(temp.passageDataItems.ok, t.passageDataItems.ok);
        r.push(cloneDeep(t));
    }
    return r;
}
//# sourceMappingURL=SimulateMerge.js.map