"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const path_1 = require("path");
function generateWatcher(originpath) {
    let ext = path_1.extname(originpath);
    let realPath = originpath;
    if (ext.length > 0) {
        realPath = path_1.dirname(originpath);
    }
    const watcher = chokidar.watch(realPath, {
        persistent: true,
    });
    return watcher;
}
exports.generateWatcher = generateWatcher;
//# sourceMappingURL=watcher.js.map