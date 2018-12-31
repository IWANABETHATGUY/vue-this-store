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
        curObjNamespaceList.length === namespace.split('.').filter(item => item.length).length + 1) {
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
function whichCommit(resMatch, posIndex, equal = true) {
    if (equal) {
        return resMatch.filter(match => posIndex >= match.index && posIndex <= match.index + match[0].length)[0];
    }
    return resMatch.filter(match => posIndex >= match.index && posIndex < match.index + match[0].length)[0];
}
exports.whichCommit = whichCommit;
function getMapGMACursorInfo(mapGetterAst, relativePos) {
    let program = mapGetterAst.program;
    let exp = program.body[0];
    let callExp = exp.expression;
    let args = callExp.arguments;
    let retCursorInfo = {
        isNamespace: false,
        namespace: '',
        secondNameSpace: '',
        match: false,
    };
    if (args.length === 1) {
        let firstArg = args[0];
        if (firstArg.type === 'ArrayExpression') {
            let cursorAtExp = firstArg.elements.filter(item => {
                return relativePos >= item.start && relativePos < item.end;
            })[0];
            if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
                retCursorInfo.match = true;
                retCursorInfo.secondNameSpace = cursorAtExp.value
                    .split('/')
                    .filter(ns => ns.length)
                    .join('.');
            }
        }
        else if (firstArg.type === 'StringLiteral' && !retCursorInfo.match) {
            let cursorAtExp = relativePos >= firstArg.start && relativePos < firstArg.end;
            if (cursorAtExp) {
                retCursorInfo.match = true;
                retCursorInfo.isNamespace = true;
                retCursorInfo.namespace = firstArg.value;
            }
        }
        else if (firstArg.type === 'ObjectExpression' && !retCursorInfo.match) {
            let cursorAtExp = firstArg.properties.filter((property) => {
                return relativePos >= property.start && relativePos < property.end;
            })[0];
            if (cursorAtExp && cursorAtExp.type === 'ObjectProperty' && cursorAtExp.value.type === 'StringLiteral') {
                retCursorInfo.match = true;
                retCursorInfo.secondNameSpace = cursorAtExp.value.value
                    .split('/')
                    .filter(ns => ns.length)
                    .join('.');
            }
        }
    }
    else if (args.length === 2) {
        let firstArg = args[0];
        let secondArg = args[1];
        if (firstArg.type === 'StringLiteral' && !retCursorInfo.match) {
            if (relativePos >= firstArg.start && relativePos < firstArg.end) {
                retCursorInfo.match = true;
                retCursorInfo.isNamespace = true;
                retCursorInfo.namespace = firstArg.value;
            }
            if (secondArg.type === 'ArrayExpression' && !retCursorInfo.match) {
                let cursorAtExp = secondArg.elements.filter(item => {
                    return relativePos >= item.start && relativePos < item.end;
                })[0];
                if (cursorAtExp && cursorAtExp.type === 'StringLiteral') {
                    retCursorInfo.match = true;
                    retCursorInfo.namespace = firstArg.value;
                    retCursorInfo.secondNameSpace = cursorAtExp.value
                        .split('/')
                        .filter(ns => ns.length)
                        .join('.');
                }
            }
            else if (secondArg.type === 'ObjectExpression' && !retCursorInfo.match) {
                let cursorAtProperty = secondArg.properties.filter((property) => {
                    return relativePos >= property.start && relativePos < property.end;
                })[0];
                if (cursorAtProperty &&
                    cursorAtProperty.type === 'ObjectProperty' &&
                    cursorAtProperty.value.type === 'StringLiteral') {
                    retCursorInfo.match = true;
                    retCursorInfo.namespace = firstArg.value;
                    retCursorInfo.secondNameSpace = cursorAtProperty.value.value
                        .split('/')
                        .filter(ns => ns.length)
                        .join('.');
                }
            }
        }
    }
    if (!retCursorInfo.match) {
        return null;
    }
    return retCursorInfo;
}
exports.getMapGMACursorInfo = getMapGMACursorInfo;
//# sourceMappingURL=util.js.map