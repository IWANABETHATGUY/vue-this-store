/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const loop_1 = require("./loop");
function activate(context) {
    console.time('generateState');
    let rootPath = vscode.workspace.rootPath;
    new loop_1.default(context, rootPath);
    console.timeEnd('generateState');
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map