/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
// import { vueStoreStateProviderFunciton } from './provider';
import { setStoreInfo } from './loop';
import { generateWatcher } from './watcher';
import { storeStateProvider, storeMapStateProvider } from './provider';

export function activate(context: vscode.ExtensionContext) {
  console.time('generateState');

  let rootPath = vscode.workspace.rootPath;
  if (rootPath === undefined) {
    console.log('no folder is opened');
    return;
  }
  let [storeAbsolutePath, stateKeysList] = setStoreInfo(rootPath);
  let watcher = generateWatcher(storeAbsolutePath);
  //init provider
  let stateProvider = new storeStateProvider(stateKeysList);
  let mapStateProvider = new storeMapStateProvider(stateKeysList);

  watcher.on('change', () => {
    stateKeysList = setStoreInfo(rootPath)[1];
    stateProvider.setStateKeysList(stateKeysList);
  });
  console.timeEnd('generateState');
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'),
    vscode.languages.registerCompletionItemProvider(
      'vue',
      mapStateProvider,
      "'",
      '"',
    ),
  );
}
