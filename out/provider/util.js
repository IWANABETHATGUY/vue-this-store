"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getModuleFromPath(obj, path) {
    if (path === undefined) {
        return obj;
    }
    try {
        return path.reduce((acc, cur) => {
            return acc['modules'][cur];
        }, obj);
    }
    catch (err) {
        return undefined;
    }
}
exports.getModuleFromPath = getModuleFromPath;
function getNextNamespace(obj, namespace) {
    let nextNamespaceList = [];
    let curObjNamespace = obj.namespace;
    let curObjNamespaceList = obj.namespace.split('.');
    if (curObjNamespace &&
        curObjNamespace.startsWith(namespace) &&
        curObjNamespaceList.length ===
            namespace.split('.').filter(item => item.length).length + 1) {
        nextNamespaceList.push(curObjNamespaceList[curObjNamespaceList.length - 1]);
    }
    if (obj.modules) {
        let modules = obj.modules;
        Object.keys(modules).forEach(key => {
            nextNamespaceList.push(...getNextNamespace(modules[key], namespace));
        });
    }
    return nextNamespaceList;
}
exports.getNextNamespace = getNextNamespace;
//# sourceMappingURL=util.js.map