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
    let [storeAbsolutePath, storeInfo, setStoreActionStatus] = loop_1.startFromEntry(rootPath);
    storeBarStatusItem.setStatus(setStoreActionStatus);
    let watcher = watcher_1.generateWatcher(storeAbsolutePath);
    //init provider
    let stateProvider = new provider_1.storeStateProvider(storeInfo);
    let mapStateProvider = new provider_1.storeMapStateProvider(storeInfo);
    watcher.on('change', () => {
        storeBarStatusItem.setStatus(0);
        let [_, storeInfo, setStoreActionStatus] = loop_1.startFromEntry(rootPath);
        stateProvider.setStateKeysList(storeInfo);
        mapStateProvider.setStateKeysList(storeInfo);
        storeBarStatusItem.setStatus(setStoreActionStatus);
    });
    console.timeEnd('generateState');
    context.subscriptions.push(storeBarStatusItem, vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'), vscode.languages.registerCompletionItemProvider('vue', mapStateProvider, "'", '"'));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map