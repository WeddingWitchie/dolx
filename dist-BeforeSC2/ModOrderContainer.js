import { isArray, isObject, isString, clone, uniqBy, orderBy, isEqualWith, isMap, isFunction, isNil, } from 'lodash';
export var ModLoadFromSourceType;
(function (ModLoadFromSourceType) {
    ModLoadFromSourceType["Remote"] = "Remote";
    ModLoadFromSourceType["Local"] = "Local";
    ModLoadFromSourceType["LocalStorage"] = "LocalStorage";
    ModLoadFromSourceType["IndexDB"] = "IndexDB";
    ModLoadFromSourceType["SideLazy"] = "SideLazy";
})(ModLoadFromSourceType || (ModLoadFromSourceType = {}));
export function isModOrderItem(a) {
    return a
        && isString(a.name)
        && isObject(a.mod)
        && isObject(a.zip)
        && !isNil(a.from);
}
class CustomIterableIterator {
    constructor(parent, nextF, cache) {
        this.parent = parent;
        this.nextF = nextF;
        this.cache = cache;
        this.index = 0;
    }
    [Symbol.iterator]() {
        return this;
    }
    next(...args) {
        const r = this.nextF(this.index, this.parent, this);
        ++this.index;
        return r;
    }
}
class CustomReadonlyMapHelper {
    [Symbol.iterator]() {
        return this.entries();
    }
    forEach(callback, thisArg) {
        for (const nn of this.entries()) {
            callback(this.get(nn[0]), nn[0], this);
        }
    }
    keys() {
        return new CustomIterableIterator(this, (index, p, ito) => {
            var _a;
            return {
                done: index >= this.size,
                value: (_a = ito.cache[index]) === null || _a === void 0 ? void 0 : _a[0],
            };
        }, Array.from(this.entries()));
    }
    values() {
        return new CustomIterableIterator(this, (index, p, ito) => {
            var _a;
            return {
                done: index >= this.size,
                value: (_a = ito.cache[index]) === null || _a === void 0 ? void 0 : _a[1],
            };
        }, Array.from(this.entries()));
    }
}
export class ModOrderContainer_One_ReadonlyMap extends CustomReadonlyMapHelper {
    constructor(parent) {
        super();
        this.parent = parent;
        parent.checkNameUniq();
    }
    get size() {
        return this.parent.container.size;
    }
    ;
    entries() {
        return new CustomIterableIterator(this.parent, (index, p, ito) => {
            if (index >= p.container.size) {
                return { done: true, value: undefined };
            }
            else {
                const it = ito.cache[index];
                const itt = this.get(it);
                // console.log('entries()', index, it, itt);
                if (!it || !itt) {
                    console.error('entries() (!it || !itt)', index, it, itt);
                    throw new Error('entries() (!it || !itt)');
                }
                return { done: false, value: [it, itt] };
            }
        }, Array.from(this.parent.container.keys()));
    }
    get(key) {
        var _a;
        return (_a = this.parent.container.get(key)) === null || _a === void 0 ? void 0 : _a.values().next().value;
    }
    has(key) {
        return this.parent.container.has(key) && this.parent.container.get(key).size > 0;
    }
}
export class ModOrderContainer_OneAlias_ReadonlyMap extends CustomReadonlyMapHelper {
    constructor(parent) {
        super();
        this.parent = parent;
        parent.checkAlias();
        parent.checkNameUniq();
    }
    get size() {
        return this.parent.nameRefWithAlias.size;
    }
    ;
    entries() {
        return new CustomIterableIterator(this.parent, (index, p, ito) => {
            if (index >= p.container.size) {
                return { done: true, value: undefined };
            }
            else {
                const it = ito.cache[index];
                const itt = this.get(it);
                // console.log('entries()', index, it, itt);
                if (!it || !itt) {
                    console.error('entries() (!it || !itt)', index, it, itt);
                    throw new Error('entries() (!it || !itt)');
                }
                return { done: false, value: [it, itt] };
            }
        }, Array.from(this.parent.nameRefWithAlias.keys()));
    }
    get(key) {
        var _a;
        const name = this.parent.nameRefWithAlias.get(key);
        if (!name) {
            return undefined;
        }
        return (_a = this.parent.container.get(name)) === null || _a === void 0 ? void 0 : _a.values().next().value;
    }
    has(key) {
        return this.parent.nameRefWithAlias.has(key);
    }
}
export function isModOrderContainer(a) {
    return a
        && isArray(a.order)
        && isMap(a.container)
        && isFunction(a.checkData);
}
/**
 * a multi-index container designed for mod load cache list. work like a C++ Boost.MultiIndexContainer
 * can keep mod `order` , optional keep mod `unique` , remember mod load `from source`
 */
export class ModOrderContainer {
    constructor() {
        // keep unique key<name-from>, means a name have multi mod, but no multi mod from same source if there have same name.
        this.container = new Map();
        // keep order
        this.order = [];
        this.nameRefWithAlias = new Map();
    }
    /**
     * O(1)
     *
     * add addition limit that keep mod name unique
     */
    get_One_Map() {
        return new ModOrderContainer_One_ReadonlyMap(this);
    }
    get_One_Map_WithAlias() {
        return new ModOrderContainer_OneAlias_ReadonlyMap(this);
    }
    /**
     * O(2n)
     *
     * add addition limit that keep mod name unique
     */
    get_One_Array() {
        this.checkNameUniq();
        return uniqBy(this.order, T => T.name);
    }
    /**
     * O(n)
     */
    get_Array() {
        return clone(this.order);
    }
    /**
     * O(n)
     */
    getAllName() {
        return Array.from(this.nameRefWithAlias.keys());
    }
    /**
     * O(1)
     */
    getHasByName(name) {
        return this.container.has(name) && this.container.get(name).size > 0;
    }
    /**
     * O(1)
     */
    getHasByNameWithAlias(name) {
        return this.nameRefWithAlias.has(name);
    }
    /**
     * O(1)
     */
    getHasByNameFrom(name, from) {
        return this.container.has(name) && this.container.get(name).has(from);
    }
    /**
     * O(1)
     */
    getByName(name) {
        return this.container.get(name);
    }
    /**
     * O(1)
     */
    getModOrderItemByNameWithAlias(name) {
        const n = this.nameRefWithAlias.get(name);
        if (!n) {
            return undefined;
        }
        return this.container.get(n);
    }
    /**
     * O(1)
     */
    getByNameOne(name, noError = false) {
        this.checkNameUniq();
        const nn = this.container.get(name);
        if (!nn) {
            if (noError) {
                return undefined;
            }
            console.error('ModOrderContainer getByNameOne() cannot find name.', [name, this.clone()]);
            return undefined;
        }
        if (nn.size > 1) {
            console.error('ModOrderContainer getByNameOne() has more than one mod.', [name, nn]);
        }
        return nn.values().next().value;
    }
    /**
     * O(1)
     */
    getByNameOneWithAlias(name, noError = false) {
        this.checkNameUniq();
        const na = this.nameRefWithAlias.get(name);
        if (!na) {
            if (noError) {
                return undefined;
            }
            console.error('ModOrderContainer getByNameOneWithAlias() cannot find name/alias.', [name, this.clone()]);
            return undefined;
        }
        const nn = this.container.get(na);
        if (!nn) {
            if (noError) {
                return undefined;
            }
            console.error('ModOrderContainer getByNameOneWithAlias() cannot find name.', [name, na, this.clone()]);
            return undefined;
        }
        if (nn.size > 1) {
            console.error('ModOrderContainer getByNameOneWithAlias() has more than one mod.', [name, na, nn]);
        }
        return nn.values().next().value;
    }
    /**
     * O(n)
     */
    getByFromTypeByOrder(from) {
        return this.order.filter(T => T.from === from);
    }
    /**
     * O(n)
     */
    getByOrder(name) {
        return this.order.filter(T => T.name === name);
    }
    /**
     * O(n)
     */
    checkNameUniq() {
        for (const [name, m] of this.container) {
            if (m.size > 1) {
                console.error('ModOrderContainer checkNameUniq() name not uniq.', [name, m]);
                return false;
            }
        }
        return true;
    }
    /**
     * O(n)
     */
    checkAlias() {
        const alias = new Set();
        for (const [name, m] of this.container) {
            alias.add(name);
            for (const a of m.values()) {
                for (const al of a.mod.alias) {
                    alias.add(al);
                }
            }
        }
        if (alias.size !== this.nameRefWithAlias.size) {
            console.error('ModOrderContainer checkAlias() alias invalid.', [alias, this.nameRefWithAlias]);
            return false;
        }
        return true;
    }
    /**
     * O(n+2log(n))
     */
    checkData() {
        // covert container to order , sort it, then compare order one-by-one to check container==order
        const order = [];
        for (const [name, m] of this.container) {
            for (const [from, item] of m) {
                order.push(item);
                if (item.name !== name || item.from !== from) {
                    console.error('ModOrderContainer checkData() failed. inner data modify.', [item, name, from]);
                    return false;
                }
            }
        }
        const order1 = orderBy(order, ['name', 'from'], ['asc', 'asc']);
        const order2 = orderBy(this.order, ['name', 'from'], ['asc', 'asc']);
        if (!isEqualWith(order1, order2, (a, b) => a.name === b.name && a.from === b.from)) {
            console.error('ModOrderContainer checkData() failed.', [order1, order2]);
            return false;
        }
        return true;
    }
    /**
     * O(n)
     */
    delete(name, from) {
        const m = this.container.get(name);
        if (m) {
            if (m.has(from)) {
                const mod = m.get(from);
                m.delete(from);
                if (m.size === 0) {
                    this.container.delete(name);
                }
                this.order = this.order.filter(T => T.name !== name && T.from !== from);
                this.removeModNameRefWithAlias(mod);
                return true;
            }
        }
        return false;
    }
    /**
     * O(n)
     */
    deleteAll(name) {
        const m = this.container.get(name);
        if (m) {
            this.container.delete(name);
            this.order = this.order.filter(T => T.name !== name);
            this.rebuildNameRefWithAlias();
            this.checkData();
            return true;
        }
        return false;
    }
    /**
     * O(1)
     */
    createModOrderItem(zip, from) {
        if (!zip.modInfo) {
            console.error('ModOrderContainer createModOrderItem() zip.modInfo not found.', [zip]);
            return undefined;
        }
        return {
            name: zip.modInfo.name,
            from: from,
            mod: zip.modInfo,
            zip: zip,
        };
    }
    /**
     * O(2n)
     */
    pushFront(zip, from) {
        const obj = this.createModOrderItem(zip, from);
        if (!obj) {
            console.error('ModOrderContainer pushFront() createModOrderItem() failed.', [zip, from]);
            return false;
        }
        if (!this.container.has(obj.name)) {
            this.container.set(obj.name, new Map());
        }
        const m = this.container.get(obj.name);
        m.set(obj.from, obj);
        const ii = this.order.findIndex(T => T.name === obj.name && T.from === obj.from);
        if (ii >= 0) {
            this.order.splice(ii, 1);
        }
        this.order = [obj, ...this.order];
        this.addModNameRefWithAlias(obj);
        this.checkData();
        return true;
    }
    /**
     * O(2n)
     */
    pushBack(zip, from) {
        const obj = this.createModOrderItem(zip, from);
        if (!obj) {
            console.error('ModOrderContainer pushBack() createModOrderItem() failed.', [zip, from]);
            return false;
        }
        if (!this.container.has(obj.name)) {
            this.container.set(obj.name, new Map());
        }
        const m = this.container.get(obj.name);
        m.set(obj.from, obj);
        const ii = this.order.findIndex(T => T.name === obj.name && T.from === obj.from);
        if (ii >= 0) {
            this.order.splice(ii, 1);
        }
        this.order.push(obj);
        this.addModNameRefWithAlias(obj);
        this.checkData();
        return true;
    }
    /**
     * O(2n)
     */
    insertReplace(zip, from) {
        const obj = this.createModOrderItem(zip, from);
        if (!obj) {
            console.error('ModOrderContainer insertReplace() createModOrderItem() failed.', [zip, from]);
            return false;
        }
        if (!this.container.has(obj.name)) {
            this.container.set(obj.name, new Map());
        }
        const m = this.container.get(obj.name);
        m.set(obj.from, obj);
        const ii = this.order.findIndex(T => T.name === obj.name && T.from === obj.from);
        if (ii >= 0) {
            this.order.splice(ii, 0, obj);
        }
        this.rebuildNameRefWithAlias();
        this.checkData();
        return true;
    }
    /**
     * O(n)
     */
    popOut(name, from) {
        const m = this.container.get(name);
        if (m) {
            const n = m.get(from);
            if (!!n) {
                m.delete(n.from);
                if (m.size === 0) {
                    this.container.delete(name);
                }
                this.order = this.order.filter(T => T.name !== n.name && T.from !== n.from);
                this.removeModNameRefWithAlias(n);
                this.checkData();
                return n;
            }
        }
        return undefined;
    }
    /**
     * O(n)
     */
    popOutAll(name) {
        const m = this.container.get(name);
        if (m) {
            this.container.delete(name);
            this.order = this.order.filter(T => T.name !== name);
            this.rebuildNameRefWithAlias();
            this.checkData();
            return Array.from(m.values());
        }
        return undefined;
    }
    /**
     * O(1)
     */
    popFront() {
        const obj = this.order.shift();
        if (obj) {
            const m = this.container.get(obj.name);
            if (m) {
                m.delete(obj.from);
                if (m.size === 0) {
                    this.container.delete(obj.name);
                }
                this.removeModNameRefWithAlias(obj);
                this.checkData();
                return obj;
            }
        }
        return undefined;
    }
    /**
     * O(1)
     */
    clear() {
        this.container.clear();
        this.order = [];
        this.nameRefWithAlias.clear();
    }
    /**
     * O(1)
     */
    get size() {
        return this.order.length;
    }
    /**
     * O(2n)
     */
    clone() {
        const r = new ModOrderContainer();
        r.container = new Map();
        for (const [name, m] of this.container) {
            const mm = new Map();
            for (const [from, item] of m) {
                mm.set(from, r.createModOrderItem(item.zip, item.from));
            }
            r.container.set(name, mm);
        }
        r.order = [];
        for (const item of this.order) {
            r.order.push(r.createModOrderItem(item.zip, item.from));
        }
        r.rebuildNameRefWithAlias();
        r.checkData();
        return r;
    }
    rebuildNameRefWithAlias() {
        this.nameRefWithAlias.clear();
        for (const item of this.order) {
            this.nameRefWithAlias.set(item.name, item.name);
            for (const alias of item.mod.alias) {
                this.nameRefWithAlias.set(alias, item.name);
            }
        }
    }
    addModNameRefWithAlias(modOrderItem) {
        this.nameRefWithAlias.set(modOrderItem.name, modOrderItem.name);
        for (const alias of modOrderItem.mod.alias) {
            this.nameRefWithAlias.set(alias, modOrderItem.name);
        }
    }
    removeModNameRefWithAlias(modOrderItem) {
        this.nameRefWithAlias.delete(modOrderItem.name);
        for (const alias of modOrderItem.mod.alias) {
            this.nameRefWithAlias.delete(alias);
        }
    }
    /**
     * O(n)
     */
    rebuildContainerFromOrder() {
        this.container.clear();
        this.nameRefWithAlias.clear();
        for (const item of this.order) {
            this.nameRefWithAlias.set(item.name, item.name);
            for (const alias of item.mod.alias) {
                this.nameRefWithAlias.set(alias, item.name);
            }
            if (!this.container.has(item.name)) {
                this.container.set(item.name, new Map());
            }
            const m = this.container.get(item.name);
            if (m) {
                m.set(item.from, item);
            }
        }
        this.checkData();
    }
    /**
     * O(2n)
     */
    splitCloneInArray(name, from) {
        // split to 3 piece
        const index = this.order.findIndex(T => T.name === name && T.from === from);
        if (index === -1) {
            return undefined;
        }
        const r = {
            before: new ModOrderContainer(),
            current: this.order.slice(index, index + 1)[0],
            after: new ModOrderContainer(),
        };
        r.before.order = this.order.slice(0, index);
        r.after.order = this.order.slice(index + 1);
        r.before.rebuildContainerFromOrder();
        r.after.rebuildContainerFromOrder();
        return r;
    }
    static mergeModOrderContainer(nnn) {
        const r = new ModOrderContainer();
        r.order = [];
        for (const n of nnn) {
            if (isModOrderContainer(n)) {
                r.order = r.order.concat(n.order);
            }
            else if (isModOrderItem(n)) {
                r.order.push(n);
            }
            else {
                // never go there
                console.error('ModOrderContainer mergeModOrderContainer() unknown type.', [n]);
                throw new Error('ModOrderContainer mergeModOrderContainer() unknown type.');
            }
        }
        r.rebuildContainerFromOrder();
        return r;
    }
}
//# sourceMappingURL=ModOrderContainer.js.map