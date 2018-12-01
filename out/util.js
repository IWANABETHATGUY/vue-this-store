"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("@babel/parser");
const traverse_1 = require("@babel/traverse");
const fs = require("fs");
const path = require("path");
function getAstOfCode(code) {
    return parser_1.parse(code, { sourceType: 'module' });
}
exports.getAstOfCode = getAstOfCode;
function getFileContent(basePath, relativePath = '') {
    let absolutStorePath = path.resolve(basePath, relativePath);
    let statObj = fs.statSync(absolutStorePath);
    if (statObj.isDirectory()) {
        absolutStorePath = path.resolve(absolutStorePath, 'index.js');
    }
    if (fs.existsSync(absolutStorePath)) {
        let storeEntryContent = fs.readFileSync(absolutStorePath, {
            encoding: 'utf8',
        });
        return storeEntryContent;
    }
    return '';
}
exports.getFileContent = getFileContent;
function getStateKeysFromStore(storeContent) {
    let ast = getAstOfCode(storeContent);
    return getStatekeysFromAst(ast);
}
exports.getStateKeysFromStore = getStateKeysFromStore;
function getStatekeysFromAst(ast) {
    let stateList = [];
    traverse_1.default(ast, {
        VariableDeclarator(path) {
            let isStateLike = looksLike(path, {
                node: {
                    id: {
                        name: 'state',
                    },
                },
            });
            if (isStateLike) {
                let node = path.node;
                let init = node.init;
                let properties = init.properties;
                stateList = properties.map(property => {
                    return property.key.name;
                });
            }
        },
    });
    return stateList;
}
function getStoreEntryRelativePath(ast) {
    let moduleMap = {};
    let localVueIdentifier = '';
    let storeRelativeEntry = '';
    traverse_1.default(ast, {
        ImportDeclaration(path) {
            let node = path.node;
            let defaultSpecifier = node.specifiers.filter(spec => spec.type === 'ImportDefaultSpecifier')[0];
            if (!defaultSpecifier)
                return;
            let local = defaultSpecifier.local.name;
            let moduleOrPath = node.source.value;
            if (moduleOrPath === 'vue')
                localVueIdentifier = local;
            moduleMap[local] = {
                moduleOrPath,
            };
        },
        NewExpression(path) {
            let node = path.node;
            let callee = node.callee;
            if (callee.type === 'Identifier') {
                if (callee.name === localVueIdentifier) {
                    let config = node.arguments[0];
                    config.properties.forEach((property) => {
                        let key = property.key;
                        let value = property.value;
                        if (key.name === 'store') {
                            storeRelativeEntry = moduleMap[value.name].moduleOrPath;
                        }
                    });
                }
            }
        },
    });
    return storeRelativeEntry;
}
exports.getStoreEntryRelativePath = getStoreEntryRelativePath;
function looksLike(a, b) {
    return (a &&
        b &&
        Object.keys(b).every(bKey => {
            const bVal = b[bKey];
            const aVal = a[bKey];
            if (typeof bVal === 'function') {
                return bVal(aVal);
            }
            return isPrimitive(bVal) ? bVal === aVal : looksLike(aVal, bVal);
        }));
}
function isPrimitive(val) {
    return val == null || /^[sbn]/.test(typeof val);
}
//# sourceMappingURL=util.js.map