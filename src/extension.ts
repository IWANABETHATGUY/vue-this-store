/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
// import { vueStoreStateProviderFunciton } from './provider';
import { setStoreInfo } from './loop';
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
  let [storeAbsolutePath, stateKeysList, setStoreActionStatus] = setStoreInfo(
    rootPath,
  );
  storeBarStatusItem.setStatus(setStoreActionStatus);
  let watcher = generateWatcher(storeAbsolutePath);
  //init provider
  let stateProvider = new storeStateProvider(stateKeysList);
  let mapStateProvider = new storeMapStateProvider(stateKeysList);

  watcher.on('change', () => {
    storeBarStatusItem.setStatus(0);
    let [_, stateKeysList, setStoreActionStatus] = setStoreInfo(rootPath);
    stateProvider.setStateKeysList(stateKeysList);
    mapStateProvider.setStateKeysList(stateKeysList);
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
