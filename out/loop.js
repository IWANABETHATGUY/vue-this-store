"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const util_1 = require("./util");
const modules_1 = require("./traverse/modules");
const utils_1 = require("./traverse/utils");
function startFromEntry(rootPath) {
    let entry = path.resolve(rootPath, 'src/main.js');
    if (!fs.existsSync(entry)) {
        console.error("you don't have the entry file");
        return ['', {}, -1];
    }
    let { fileContent: entryFileContent, status: entryFileStatus, } = util_1.getFileContent(entry);
    if (entryFileContent === '') {
        return ['', {}, entryFileStatus];
    }
    let entryFileContentAst = util_1.getAstOfCode(entryFileContent);
    let storeRelativePath = util_1.getStoreEntryRelativePath(entryFileContentAst);
    let storeAbsolutePath = util_1.getAbsolutePath(entry, storeRelativePath);
    let { objAst, m2pmap, defmap, cwf, lineOfFile } = utils_1.getVuexConfig(storeAbsolutePath);
    try {
        let storeInfo = modules_1.parseModuleAst({
            objAst,
            m2pmap,
            defmap,
            cwf,
            lineOfFile,
        });
        debugger;
        return [storeAbsolutePath, storeInfo, 1];
    }
    catch (err) {
        console.log(err);
        debugger;
        return [storeAbsolutePath, {}, -1];
    }
}
exports.startFromEntry = startFromEntry;
//# sourceMappingURL=loop.js.map