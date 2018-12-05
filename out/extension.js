/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
// import { vueStoreStateProviderFunciton } from './provider';
const loop_1 = require("./loop");
const watcher_1 = require("./watcher");
const stateProvider_1 = require("./provider/stateProvider");
const statusBarItem_1 = require("./statusBarItem");
const gettersProvider_1 = require("./provider/gettersProvider");
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
    let stateProvider = new stateProvider_1.storeStateProvider(storeInfo);
    let mapStateProvider = new stateProvider_1.storeMapStateProvider(storeInfo);
    let gettersProvider = new gettersProvider_1.storeGettersProvider(storeInfo);
    watcher.on('change', () => {
        storeBarStatusItem.setStatus(0);
        let [_, storeInfo, setStoreActionStatus] = loop_1.startFromEntry(rootPath);
        stateProvider.setStateKeysList(storeInfo);
        mapStateProvider.setStateKeysList(storeInfo);
        storeBarStatusItem.setStatus(setStoreActionStatus);
    });
    console.timeEnd('generateState');
    context.subscriptions.push(storeBarStatusItem, vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'), vscode.languages.registerCompletionItemProvider('vue', mapStateProvider, "'", '"'), vscode.languages.registerCompletionItemProvider('vue', gettersProvider, '.'));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map