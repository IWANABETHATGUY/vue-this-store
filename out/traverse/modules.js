"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const types_1 = require("@babel/types");
const state_1 = require("./state");
const getters_1 = require("./getters");
const mutations_1 = require("./mutations");
const actions_1 = require("./actions");
function getXXXInfo({ property, m2pmap, defmap, cwf, lineOfFile }, walkFileFn, parseFn) {
    let infoList = [];
    if (property.shorthand) {
        let value = property.value;
        if (m2pmap[value.name]) {
            let { export: importState, lineOfFile } = walkFileFn(cwf, m2pmap[value.name]);
            infoList = parseFn(importState, lineOfFile);
        }
        else if (defmap[value.name]) {
            infoList = parseFn(defmap[value.name], lineOfFile);
        }
    }
    else {
        if (property.value.type === 'ObjectExpression') {
            let value = property.value;
            infoList = parseFn(value, lineOfFile);
        }
    }
    return infoList;
}
function getModulesInfo({ property, m2pmap, defmap, cwf, lineOfFile, namespace, }) {
    let modules = {};
    let config = {
        lineOfFile,
        m2pmap,
        defmap,
        cwf,
    };
    if (property.shorthand) {
        let value = property.value;
        if (m2pmap[value.name]) {
            let { cwf: cwff, m2pmap: m2pmapp, objAst: objAstt, defmap: defmapp, lineOfFile: lineOfFilee, } = walkModulesFile(cwf, m2pmap[value.name]);
            modules = parseModules({
                objAst: objAstt,
                m2pmap: m2pmapp,
                defmap: defmapp,
                cwf: cwff,
                lineOfFile: lineOfFilee,
            }, namespace);
        }
        else if (defmap[value.name]) {
            modules = parseModules(Object.assign({ objAst: defmap[value.name] }, config), namespace);
        }
    }
    else {
        if (property.value.type === 'ObjectExpression') {
            modules = parseModules(Object.assign({ objAst: property.value }, config), namespace);
        }
    }
    return modules;
}
function parseModuleAst({ objAst, m2pmap, defmap, cwf, lineOfFile }, infoObj) {
    objAst.properties.forEach((property) => {
        let config = { property, m2pmap, defmap, cwf, lineOfFile };
        switch (property.key.name) {
            case 'state':
                infoObj.state = getXXXInfo(config, state_1.walkFile, state_1.parseState);
                break;
            case 'actions':
                infoObj.actions = getXXXInfo(config, actions_1.walkActionsFile, actions_1.parseActions);
                break;
            case 'getters':
                infoObj.getters = getXXXInfo(config, state_1.walkFile, getters_1.parseGetters);
                break;
            case 'mutations':
                infoObj.mutations = getXXXInfo(config, mutations_1.walkMutationsFile, state_1.parseState);
                break;
            case 'modules':
                infoObj.modules = getModulesInfo(Object.assign({}, config, { namespace: infoObj.namespace }));
                break;
            default:
        }
    });
    return infoObj;
}
exports.parseModuleAst = parseModuleAst;
function walkModulesFile(base, relative = '') {
    let filename = utils_1.getAbsolutePath(base, relative);
    let fileContent = utils_1.getFileContent(filename);
    let ast = utils_1.getAst(fileContent);
    let defineAstMap = utils_1.getFileDefinationAstMap(ast);
    let moduleOrPathMap = utils_1.getModuleOrPathMap(ast);
    let exportDefault = ast.program.body.filter(item => item.type === 'ExportDefaultDeclaration')[0];
    utils_1.transformShorthand(exportDefault, defineAstMap);
    return {
        objAst: exportDefault ? exportDefault.declaration : types_1.objectExpression([]),
        lineOfFile: fileContent.split('\n'),
        defmap: defineAstMap,
        m2pmap: moduleOrPathMap,
        cwf: filename,
    };
}
exports.walkModulesFile = walkModulesFile;
function parseModules({ objAst, m2pmap, defmap, cwf, lineOfFile }, namespace) {
    let infoObj = {};
    objAst.properties.forEach((property) => {
        let ParseModuleParam = {
            m2pmap,
            defmap,
            cwf,
            lineOfFile,
        };
        let key = property.key;
        let namespaceProperty;
        let value;
        if (property.shorthand) {
            if (m2pmap[property.key.name]) {
                let { objAst: objAstt, m2pmap: m2pmapp, defmap: defmapp, cwf: cwff, lineOfFile: lineOfFilee, } = walkModulesFile(cwf, m2pmap[property.key.name]);
                ParseModuleParam = {
                    m2pmap: m2pmapp,
                    defmap: defmapp,
                    cwf: cwff,
                    lineOfFile: lineOfFilee,
                };
                value = objAstt;
            }
        }
        else {
            if (property.value.type === 'ObjectExpression') {
                value = property.value;
            }
            else if (property.value.type === 'Identifier') {
                if (m2pmap[property.value.name]) {
                    let { objAst: objAstt, m2pmap: m2pmapp, defmap: defmapp, cwf: cwff, lineOfFile: lineOfFilee, } = walkModulesFile(cwf, m2pmap[property.value.name]);
                    ParseModuleParam = {
                        m2pmap: m2pmapp,
                        defmap: defmapp,
                        cwf: cwff,
                        lineOfFile: lineOfFilee,
                    };
                    value = objAstt;
                }
            }
        }
        if (value) {
            namespaceProperty = value.properties.filter((prop) => prop.key.name === 'namespaced')[0];
        }
        let needNewSpace = namespaceProperty && namespaceProperty.value.value;
        let moduleName = key.type === 'StringLiteral' ? key.value : key.name;
        infoObj[moduleName] = {
            namespace: needNewSpace
                ? namespace
                    .split('.')
                    .filter(item => item.length)
                    .concat([moduleName])
                    .join('.')
                : namespace,
        };
        parseModuleAst(Object.assign({ objAst: value }, ParseModuleParam), infoObj[moduleName]);
    });
    return infoObj;
}
exports.parseModules = parseModules;
//# sourceMappingURL=modules.js.map