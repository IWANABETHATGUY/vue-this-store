/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
// import { vueStoreStateProviderFunciton } from './provider';
const loop_1 = require("./loop");
const watcher_1 = require("./watcher");
const provider_1 = require("./provider");
function activate(context) {
    let rootPath = vscode.workspace.rootPath;
    if (rootPath === undefined) {
        console.log('no folder is opened');
        return;
    }
    let [storeAbsolutePath, stateKeysList] = loop_1.setStoreInfo(rootPath);
    let watcher = watcher_1.generateWatcher(storeAbsolutePath);
    let stateProvider = new provider_1.storeStateProvider(stateKeysList);
    watcher.on('change', () => {
        stateKeysList = loop_1.setStoreInfo(rootPath)[1];
        stateProvider.setStateKeysList(stateKeysList);
    });
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map