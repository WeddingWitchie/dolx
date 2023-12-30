import { cloneDeep, parseInt } from "lodash";
export class CacheRecord {
    constructor(log, dataSource, cacheRecordName) {
        this.log = log;
        this.dataSource = dataSource;
        this.cacheRecordName = cacheRecordName;
        this.items = [];
        this.map = new Map();
        this.noName = [];
    }
    clean() {
        this.items = [];
        this.map.clear();
        this.noName = [];
        this.dataSource = '';
        this.cacheRecordName = '';
    }
    fillMap() {
        this.map.clear();
        this.noName = [];
        for (const item of this.items) {
            if (item.name) {
                if (this.map.has(item.name)) {
                    console.warn('CacheRecord.fillMap() has duplicate name:', [item.name], [this.cacheRecordName, this.dataSource]);
                    this.log.warn(`CacheRecord.fillMap() has duplicate name: [${item.name}] [${this.cacheRecordName} ${this.dataSource}]`);
                }
                this.map.set(item.name, item);
            }
            else {
                this.noName.push(item);
            }
        }
    }
    back2Array() {
        this.items = Array.from(this.map.values()).concat(this.noName);
    }
    replaceMerge(c, noWarnning = false) {
        // console.log('CacheRecord.replaceMerge() start this.items', this.items.length);
        // console.log('CacheRecord.replaceMerge() start this.map.size', this.map.size);
        for (const item of c.items) {
            if (this.map.has(item.name)) {
                if (!noWarnning) {
                    console.warn('CacheRecord.replaceMerge() has duplicate name:', [this.cacheRecordName, this.dataSource], [c.cacheRecordName, c.dataSource], this.map, c.items, [item.name, item.content]);
                    this.log.warn(`CacheRecord.replaceMerge() has duplicate name: ` +
                        `[${this.cacheRecordName} ${this.dataSource}] [${c.cacheRecordName} ${c.dataSource}] ${item.name}`);
                }
            }
            this.map.set(item.name, item);
        }
        this.noName = this.noName.concat(c.noName);
        this.items = Array.from(this.map.values()).concat(this.noName);
        // console.log('CacheRecord.replaceMerge() end this.items', this.items.length);
        // console.log('CacheRecord.replaceMerge() end this.map.size', this.map.size);
    }
    concatMerge(c) {
        for (const item of c.items) {
            if (this.map.has(item.name)) {
                const n = this.map.get(item.name);
                n.content = n.content + '\n' + item.content;
            }
            else {
                this.map.set(item.name, item);
            }
        }
        this.noName = this.noName.concat(c.noName);
        this.items = Array.from(this.map.values()).concat(this.noName);
    }
}
export class SC2DataInfo {
    constructor(log, 
    // 'orgin' OR modName
    dataSource) {
        this.log = log;
        this.dataSource = dataSource;
        // init on there for fix babel https://github.com/babel/babel/issues/13779
        this.styleFileItems = new CacheRecord(this.log, this.dataSource, 'styleFileItems');
        this.scriptFileItems = new CacheRecord(this.log, this.dataSource, 'scriptFileItems');
        this.passageDataItems = new CacheRecord(this.log, this.dataSource, 'passageDataItems');
    }
    clean() {
        this.scriptFileItems.clean();
    }
}
export class SC2DataInfoCache extends SC2DataInfo {
    cloneSC2DataInfo() {
        const r = new SC2DataInfo(this.log, this.dataSource);
        r.styleFileItems = cloneDeep(this.styleFileItems);
        r.scriptFileItems = cloneDeep(this.scriptFileItems);
        r.passageDataItems = cloneDeep(this.passageDataItems);
        return r;
    }
    constructor(log, dataSource, scriptNode, styleNode, passageDataNodes) {
        var _a;
        super(log, dataSource);
        this.log = log;
        this.dataSource = dataSource;
        this.scriptNode = scriptNode;
        this.styleNode = styleNode;
        this.passageDataNodes = passageDataNodes;
        for (const sn of styleNode) {
            // /* twine-user-stylesheet #1: "error.css" */
            const syl = sn.innerText.split(/(\/\* twine-user-stylesheet #)(\d+): "([^'"]+)" \*\//);
            // will get : ["xxxxx", "/* twine-user-stylesheet #", "1", "error.css", "xxxxx"]
            for (let i = 0; i < syl.length;) {
                if (syl[i] === "/* twine-user-stylesheet #") {
                    this.styleFileItems.items.push({
                        id: parseInt(syl[++i]),
                        name: syl[++i],
                        content: syl[++i], // i+3
                    });
                }
                ++i;
            }
        }
        this.styleFileItems.fillMap();
        for (const sn of scriptNode) {
            // /* twine-user-script #1: "namespace.js" */
            const scl = sn.innerText.split(/(\/\* twine-user-script #)(\d+): "([^'"]+)" \*\//);
            // will get : ["xxxxx", "/* twine-user-script #", "1", "namespace.js", "xxxxx"]
            for (let i = 0; i < scl.length;) {
                if (scl[i] === "/* twine-user-script #") {
                    this.scriptFileItems.items.push({
                        id: parseInt(scl[++i]),
                        name: scl[++i],
                        content: scl[++i], // i+3
                    });
                }
                ++i;
            }
            // console.log('this.scriptFileItems.items sn.innerText', scl, [sn.innerText], this.scriptFileItems.items.length)
        }
        // console.log('this.scriptFileItems.items', this.scriptFileItems.items.length);
        this.scriptFileItems.fillMap();
        for (const passageDataNode of passageDataNodes) {
            // <tw-passagedata pid="1" name="Upgrade Waiting Room" tags="widget" position="100,100" size="100,100">xxxxx</tw-passagedata>
            this.passageDataItems.items.push({
                id: parseInt(passageDataNode.getAttribute('pid') || '0'),
                name: passageDataNode.getAttribute('name') || '',
                tags: ((_a = passageDataNode.getAttribute('tags')) === null || _a === void 0 ? void 0 : _a.split(' ')) || [],
                content: passageDataNode.innerText || '',
                position: passageDataNode.getAttribute('position') || '',
                size: passageDataNode.getAttribute('size') || '',
            });
        }
        this.passageDataItems.fillMap();
    }
}
//# sourceMappingURL=SC2DataInfoCache.js.map