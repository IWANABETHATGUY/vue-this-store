"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const fs = require("fs");
const util_1 = require("./util");
function setStoreInfo(rootPath) {
    let entry = path.resolve(rootPath, 'src/main.js');
    if (!fs.existsSync(entry)) {
        console.error("you don't have the entry file");
        return;
    }
    let entryFileContent = util_1.getFileContent(entry);
    let entryFileContentAst = util_1.getAstOfCode(entryFileContent);
    let storeRelativePath = util_1.getStoreEntryRelativePath(entryFileContentAst);
    let storeContent = util_1.getFileContent(entry, storeRelativePath);
    return [
        util_1.getAbsolutePath(entry, storeRelativePath),
        util_1.getStateKeysFromStore(storeContent),
    ];
}
exports.setStoreInfo = setStoreInfo;
//# sourceMappingURL=loop.js.map