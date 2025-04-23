import { get as keyval_get, set as keyval_set, del as keyval_del, createStore, setMany } from 'idb-keyval';
import { openDB as idb_openDB, deleteDB as idb_deleteDB } from 'idb';
export declare class IdbRef {
    get idb_openDB(): typeof idb_openDB;
    get idb_deleteDB(): typeof idb_deleteDB;
}
export declare class IdbKeyValRef {
    get keyval_get(): typeof keyval_get;
    get keyval_set(): typeof keyval_set;
    get keyval_del(): typeof keyval_del;
    get createStore(): typeof createStore;
    get setMany(): typeof setMany;
}
//# sourceMappingURL=IdbKeyValRef.d.ts.map