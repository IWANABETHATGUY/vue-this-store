"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const types_1 = require("@babel/types");
const state_1 = require("./state");
const getters_1 = require("./getters");
function parseModuleAst({ objAst, m2pmap, defmap, cwf, lineOfFile, }) {
    let infoObj = { state: [] };
    objAst.properties.forEach((property) => {
        switch (property.key.name) {
            case 'state':
                if (property.shorthand) {
                    let value = property.value;
                    if (m2pmap[value.name]) {
                        let { export: importState, lineOfFile } = state_1.walkFile(cwf, m2pmap[value.name]);
                        infoObj.state = state_1.parseState(importState, lineOfFile);
                    }
                    else if (defmap[value.name]) {
                        infoObj.state = state_1.parseState(defmap[value.name], lineOfFile);
                    }
                }
                else {
                    let value = property.value;
                    infoObj.state = state_1.parseState(value, lineOfFile);
                }
                break;
            case 'actions':
                // parseActions(property.value, m2pmap, defmap);
                break;
            case 'getters':
                if (property.shorthand) {
                    let value = property.value;
                    if (m2pmap[value.name]) {
                        let { export: importGetters, lineOfFile } = state_1.walkFile(cwf, m2pmap[value.name]);
                        infoObj.getters = getters_1.parseGetters(importGetters, lineOfFile);
                    }
                    else if (defmap[value.name]) {
                        infoObj.getters = getters_1.parseGetters(defmap[value.name], lineOfFile);
                    }
                }
                else {
                    let value = property.value;
                    infoObj.getters = getters_1.parseGetters(value, lineOfFile);
                }
                break;
            case 'mutations':
                // parseMutations(property.value, m2pmap, defmap);
                break;
            case 'modules':
                if (property.shorthand) {
                    let value = property.value;
                    if (m2pmap[value.name]) {
                        let { cwf: cwff, m2pmap: m2pmapp, objAst: objAstt, defmap: defmapp, lineOfFile: lineOfFilee, } = walkModulesFile(cwf, m2pmap[value.name]);
                        infoObj.modules = parseModules({
                            objAst: objAstt,
                            m2pmap: m2pmapp,
                            defmap: defmapp,
                            cwf: cwff,
                            lineOfFile: lineOfFilee,
                        });
                    }
                    else if (defmap[value.name]) {
                        infoObj.modules = parseModules({
                            objAst: defmap[value.name],
                            lineOfFile,
                            m2pmap,
                            defmap,
                            cwf,
                        });
                    }
                }
                else {
                    // parseState(value, m2pmap, defmap);
                }
                // parseModules(property.value, m2pmap, defmap);
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
        let key = property.key;
        // TODO:  这里需要注意， modules仍然可能从外部文件引入
        let value = property.value;
        infoObj[key.name] = parseModuleAst({
            objAst: value,
            m2pmap,
            defmap,
            cwf,
            lineOfFile,
        });
    });
    return infoObj;
}
exports.parseModules = parseModules;
//# sourceMappingURL=modules.js.map