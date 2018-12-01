"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chokidar = require("chokidar");
const path_1 = require("path");
function generateWatcher(path) {
    let realPath = path_1.dirname(path);
    const watcher = chokidar.watch(realPath, {
        persistent: true,
    });
    return watcher;
}
exports.generateWatcher = generateWatcher;
//# sourceMappingURL=watcher.js.map