"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const util_1 = require("./util");
const emptyModule = {
    state: [],
    abPath: '',
};
function startFromEntry(rootPath) {
    let entry = path.resolve(rootPath, 'src/main.js');
    emptyModule.abPath = entry;
    if (!fs.existsSync(entry)) {
        console.error("you don't have the entry file");
        return ['', emptyModule, -1];
    }
    let { fileContent: entryFileContent, status: entryFileStatus, } = util_1.getFileContent(entry);
    if (entryFileContent === '') {
        return ['', emptyModule, entryFileStatus];
    }
    let entryFileContentAst = util_1.getAstOfCode(entryFileContent);
    let storeRelativePath = util_1.getStoreEntryRelativePath(entryFileContentAst);
    let storeAbsolutePath = util_1.getAbsolutePath(entry, storeRelativePath);
    let { status, storeInfo } = util_1.getStoreInfoFromABPath(storeAbsolutePath);
    debugger;
    return [storeAbsolutePath, storeInfo, status];
}
exports.startFromEntry = startFromEntry;
//# sourceMappingURL=loop.js.map