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
function getPositionIndex(doc, position) {
    let docContent = doc.getText();
    let posIndex = 0;
    docContent.split('\n').some((line, index) => {
        posIndex += line.length + 1;
        return index >= position.line - 1;
    });
    posIndex += position.character;
    return posIndex;
}
exports.getPositionIndex = getPositionIndex;
function whichCommit(resMatch, posIndex) {
    return resMatch.filter(match => posIndex >= match.index && posIndex < match.index + match[0].length)[0];
}
exports.whichCommit = whichCommit;
//# sourceMappingURL=util.js.map