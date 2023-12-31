// TS 5 new style decorators
// see : https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/#decorators
//      https://wangdoc.com/typescript/decorator
export function sealed(target, context) {
    Object.seal(target);
    Object.seal(target.prototype);
}
export var ClassDecoratorUtil;
(function (ClassDecoratorUtil) {
    class InfoData {
        constructor() {
            this.configInfo = new Map();
            this.classInfo = {};
        }
    }
    ClassDecoratorUtil.InfoData = InfoData;
    function finishClassDecorate(config) {
        return function (target, context) {
            context.addInitializer(function () {
                if (config.seal) {
                    Object.seal(target);
                    Object.seal(target.prototype);
                }
            });
            if (!target.prototype.ClassDecoratorUtil_InfoData) {
                target.prototype.ClassDecoratorUtil_InfoData = new InfoData();
            }
            target.prototype.ClassDecoratorUtil_InfoData.classInfo = config;
            for (const [name, item] of target.prototype.ClassDecoratorUtil_InfoData.configInfo) {
                target.prototype = Object.defineProperty(target.prototype, name, {
                    value: target.prototype[name],
                    writable: item.config.writable,
                    configurable: item.config.configurable,
                    enumerable: item.config.enumerable,
                });
            }
            return target;
        };
    }
    ClassDecoratorUtil.finishClassDecorate = finishClassDecorate;
    // export function sealedClass<Class extends abstract new (...args: any) => any>(
    //     target: Class,
    //     context: ClassDecoratorContext<Class>
    // ) {
    //     Object.seal(target);
    //     Object.seal(target.prototype);
    // }
    function configField(config) {
        return function (value, context) {
            return function (initialValue) {
                if (!this.ClassDecoratorUtil_InfoData) {
                    this.ClassDecoratorUtil_InfoData = new InfoData();
                }
                this.ClassDecoratorUtil_InfoData.configInfo.set(context.name, {
                    info: context,
                    config: config,
                });
                return initialValue;
            };
        };
    }
    ClassDecoratorUtil.configField = configField;
    function configMethod(config) {
        return function (value, context) {
            return function (initialValue) {
                if (!this.ClassDecoratorUtil_InfoData) {
                    this.ClassDecoratorUtil_InfoData = new InfoData();
                }
                this.ClassDecoratorUtil_InfoData.configInfo.set(context.name, {
                    info: context,
                    config: config,
                });
                return initialValue;
            };
        };
    }
    ClassDecoratorUtil.configMethod = configMethod;
})(ClassDecoratorUtil || (ClassDecoratorUtil = {}));
export function sealedField(value, context) {
    return function (initialValue) {
        Object.defineProperty(this, context.name, {
            value: initialValue,
            writable: false,
            configurable: false,
            enumerable: true,
        });
    };
}
// export function sealed<Class extends abstract new (...args: any) => any>(
//     target: Class,
//     context: ClassDecoratorContext<Class>
// ) {
//     Object.seal(target);
//     Object.seal(target.prototype);
// }
export function sealedField2(initialValue) {
    return function (value, context) {
        return function () {
            Object.defineProperty(this, context.name, {
                value: initialValue,
                writable: false,
                configurable: false,
                enumerable: true,
            });
        };
    };
}
export function sealedMethod() {
    return function (target, propertyKey, descriptor) {
        descriptor.writable = false;
        descriptor.configurable = false;
    };
}
export function enumerable(value) {
    return function (target, propertyKey, descriptor) {
        descriptor.enumerable = value;
    };
}
export function configurable(value) {
    return function (target, propertyKey, descriptor) {
        descriptor.configurable = value;
    };
}
export function loggedMethod(target, context) {
    const methodName = String(context.name);
    function replacementMethod(...args) {
        console.log(`LOG: Entering method '${methodName}'.`);
        const result = target.call(this, ...args);
        console.log(`LOG: Exiting method '${methodName}'.`);
        return result;
    }
    return replacementMethod;
}
//# sourceMappingURL=DecoratorUtils.js.map