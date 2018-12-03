"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const util_1 = require("./util");
const emptyModule = {
    state: [],
};
function getStoreInfo(rootPath) {
    let entry = path.resolve(rootPath, 'src/main.js');
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
    let { fileContent: storeContent, status: storeContentStatus, } = util_1.getFileContent(entry, storeRelativePath);
    if (storeContent === '') {
        return ['', emptyModule, storeContentStatus];
    }
    let stateInfoList = util_1.getInfoFromStore(storeContent);
    let storeAbsolutePath = util_1.getAbsolutePath(entry, storeRelativePath);
    return [storeAbsolutePath, stateInfoList, 1];
}
exports.getStoreInfo = getStoreInfo;
//# sourceMappingURL=loop.js.map