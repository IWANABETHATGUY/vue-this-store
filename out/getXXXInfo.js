"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
function getModulesInfoFromAbPath(abPath) {
    let modulesInfo = { abPath };
    let { status, fileContent } = util_1.getFileContent(abPath);
    if (status === -1) {
        return null;
    }
    let ast = util_1.getAstOfCode(fileContent);
    let moduleDefinationAst = util_1.getFileDefinationAstMap(ast);
    let moduleOrPathMap = util_1.getModuleOrPathMap(ast.program);
    let fileContentLines = fileContent.split('\n');
    let program = ast.program;
    let exportDefault = program.body.filter(node => node.type === 'ExportDefaultDeclaration')[0];
    if (exportDefault) {
        let declaration = exportDefault.declaration;
        declaration.properties.forEach((property) => {
            if (property.shorthand) {
                let key = property.key.name;
                if (moduleDefinationAst[key]) {
                }
                else if (1) {
                }
            }
            else if (property.value.type === 'ObjectExpression') {
            }
        });
    }
}
exports.default = ({ storeAstMap, moduleOrPathMap, abPath, storeContentLines, }) => ({
    modules(property) {
        let moduleInfo = { abPath };
        return null;
        debugger;
        // let key = property.key.name;
        // if (property.shorthand) {
        //   if (storeAstMap[key]) {
        //   } else if (moduleOrPathMap[key]) {
        //     const newModuleABPath = getAbsolutePath(abPath, moduleOrPathMap[key]);
        //     moduleInfo.abPath = newModuleABPath;
        //   }
        //   // TODO: 需要做state从外部文件中引入的情况判断
        // } else {
        //   if (property.value.type === 'ObjectExpression') {
        //   }
        // }
        // return moduleInfo;
    },
    state(property) {
        if (property.shorthand) {
            if (storeAstMap[property.key.name]) {
                return util_1.getStateInfoList(storeAstMap[property.key.name], storeContentLines);
            }
            // TODO: 需要做state从外部文件中引入的情况判断
        }
        else {
            if (property.value.type === 'ObjectExpression') {
                return util_1.getStateInfoList(property.value, storeContentLines);
            }
        }
    },
});
//# sourceMappingURL=getXXXInfo.js.map