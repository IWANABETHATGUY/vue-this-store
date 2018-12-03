/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
// import { vueStoreStateProviderFunciton } from './provider';
import { startFromEntry } from './loop';
import { generateWatcher } from './watcher';
import { storeStateProvider, storeMapStateProvider } from './provider';
import { VueThisStoreStatusBarItem } from './statusBarItem';

export function activate(context: vscode.ExtensionContext) {
  console.time('generateState');

  let rootPath = vscode.workspace.rootPath;
  if (rootPath === undefined) {
    console.log('no folder is opened');
    return;
  }
  let storeBarStatusItem = new VueThisStoreStatusBarItem();
  context.subscriptions.push(storeBarStatusItem);
  let [storeAbsolutePath, storeInfo, setStoreActionStatus] = startFromEntry(
    rootPath,
  );
  storeBarStatusItem.setStatus(setStoreActionStatus);
  let watcher = generateWatcher(storeAbsolutePath);
  //init provider
  let stateProvider = new storeStateProvider(storeInfo);
  let mapStateProvider = new storeMapStateProvider(storeInfo);

  watcher.on('change', () => {
    storeBarStatusItem.setStatus(0);
    let [_, storeInfo, setStoreActionStatus] = startFromEntry(rootPath);
    stateProvider.setStateKeysList(storeInfo);
    mapStateProvider.setStateKeysList(storeInfo);
    storeBarStatusItem.setStatus(setStoreActionStatus);
  });
  console.timeEnd('generateState');
  context.subscriptions.push(
    storeBarStatusItem,
    vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'),
    vscode.languages.registerCompletionItemProvider(
      'vue',
      mapStateProvider,
      "'",
      '"',
    ),
  );
}
