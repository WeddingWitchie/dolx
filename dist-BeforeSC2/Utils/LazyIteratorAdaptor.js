export class LazyIteratorAdaptor {
    static find(iterator, predicate) {
        let i = 0;
        let result = iterator.next();
        while (!result.done) {
            if (predicate(result.value, i++)) {
                return result.value;
            }
            result = iterator.next();
        }
        return undefined;
    }
    static findIndex(iterator, predicate) {
        let i = 0;
        let result = iterator.next();
        while (!result.done) {
            if (predicate(result.value, i++)) {
                return i - 1;
            }
            result = iterator.next();
        }
        return -1;
    }
    static some(iterator, predicate) {
        let i = 0;
        let result = iterator.next();
        while (!result.done) {
            if (predicate(result.value, i++)) {
                return true;
            }
            result = iterator.next();
        }
        return false;
    }
    static every(iterator, predicate) {
        let i = 0;
        let result = iterator.next();
        while (!result.done) {
            if (!predicate(result.value, i++)) {
                return false;
            }
            result = iterator.next();
        }
        return true;
    }
    static filter(iterator, predicate) {
        let i = 0;
        let result = iterator.next();
        const resultArray = [];
        while (!result.done) {
            if (predicate(result.value, i++)) {
                resultArray.push(result.value);
            }
            result = iterator.next();
        }
        return resultArray;
    }
    static *filterLazy(iterator, predicate) {
        let i = 0;
        let result = iterator.next();
        while (!result.done) {
            if (predicate(result.value, i++)) {
                yield result.value;
            }
            result = iterator.next();
        }
    }
    static map(iterator, mapper) {
        let i = 0;
        let result = iterator.next();
        const resultArray = [];
        while (!result.done) {
            resultArray.push(mapper(result.value, i++));
            result = iterator.next();
        }
        return resultArray;
    }
    static *mapLazy(iterator, callback) {
        let i = 0;
        let result = iterator.next();
        while (!result.done) {
            yield callback(result.value, i++);
            result = iterator.next();
        }
    }
    static reduce(iterator, reducer, initialValue) {
        let i = 0;
        let result = iterator.next();
        let accumulator = initialValue;
        while (!result.done) {
            accumulator = reducer(accumulator, result.value, i++);
            result = iterator.next();
        }
        return accumulator;
    }
}
LazyIteratorAdaptor.find([1, 2, 3, 4, 5].values(), v => v > 3); // 4
LazyIteratorAdaptor.findIndex([1, 2, 3, 4, 5].values(), v => v > 3); // 3
LazyIteratorAdaptor.some([1, 2, 3, 4, 5].values(), v => v > 3); // true
LazyIteratorAdaptor.every([1, 2, 3, 4, 5].values(), v => v > 3); // false
LazyIteratorAdaptor.filter([1, 2, 3, 4, 5].values(), v => v > 3); // [4, 5]
Array.from(LazyIteratorAdaptor.filterLazy([1, 2, 3, 4, 5].values(), v => v > 3)); // [4, 5]
LazyIteratorAdaptor.map([1, 2, 3, 4, 5].values(), v => v * 2); // [2, 4, 6, 8, 10]
Array.from(LazyIteratorAdaptor.mapLazy([1, 2, 3, 4, 5].values(), v => v * 2)); // [2, 4, 6, 8, 10]
LazyIteratorAdaptor.reduce([1, 2, 3, 4, 5].values(), (acc, v) => acc + v, 0); // 15
// console.log('window.LazyIteratorAdaptor = LazyIteratorAdaptor');
// @ts-ignore
window.LazyIteratorAdaptor = LazyIteratorAdaptor;
;
(() => {
    try {
        // test if it is working (maybe on chrome)
        // @ts-ignore
        [1, 2, 3, 4, 5].values().reduce((acc, v) => acc + v, 0);
    }
    catch (e) {
        // need patch it (maybe in firefox)
    }
})();
//# sourceMappingURL=LazyIteratorAdaptor.js.map