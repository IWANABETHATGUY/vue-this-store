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
const statusBarItem_1 = require("./statusBarItem");
function activate(context) {
    console.time('generateState');
    let rootPath = vscode.workspace.rootPath;
    if (rootPath === undefined) {
        console.log('no folder is opened');
        return;
    }
    let storeBarStatusItem = new statusBarItem_1.VueThisStoreStatusBarItem();
    context.subscriptions.push(storeBarStatusItem);
    let [storeAbsolutePath, stateKeysList, setStoreActionStatus] = loop_1.setStoreInfo(rootPath);
    storeBarStatusItem.setStatus(setStoreActionStatus);
    let watcher = watcher_1.generateWatcher(storeAbsolutePath);
    //init provider
    let stateProvider = new provider_1.storeStateProvider(stateKeysList);
    let mapStateProvider = new provider_1.storeMapStateProvider(stateKeysList);
    watcher.on('change', () => {
        storeBarStatusItem.setStatus(0);
        let [_, stateKeysList, setStoreActionStatus] = loop_1.setStoreInfo(rootPath);
        stateProvider.setStateKeysList(stateKeysList);
        mapStateProvider.setStateKeysList(stateKeysList);
        storeBarStatusItem.setStatus(setStoreActionStatus);
    });
    console.timeEnd('generateState');
    context.subscriptions.push(storeBarStatusItem, vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'), vscode.languages.registerCompletionItemProvider('vue', mapStateProvider, "'", '"'));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map