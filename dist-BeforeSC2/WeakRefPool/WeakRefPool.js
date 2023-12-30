export function newWeakPoolRef(v) {
    return new WeakPoolRef();
}
export class WeakPoolRef {
    constructor(
    // parent: WeakRefPool<T>,
    ) {
        // this.deref = () => {
        //     return parent.pool.get(this);
        // }
    }
    get deref() {
        return instanceWeakRefPool.pool.get(this);
    }
}
export class WeakRefPool {
    constructor() {
        this.pool = new WeakMap();
    }
}
let instanceWeakRefPool = new WeakRefPool();
//# sourceMappingURL=WeakRefPool.js.map