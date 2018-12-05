"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getModuleFromPath(obj, path) {
    if (path === undefined) {
        return obj;
    }
    try {
        return path.reduce((acc, cur) => {
            return acc['modules'][cur];
        }, obj);
    }
    catch (err) {
        return undefined;
    }
}
exports.getModuleFromPath = getModuleFromPath;
//# sourceMappingURL=util.js.map