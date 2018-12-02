/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
// import { vueStoreStateProviderFunciton } from './provider';
import { setStoreInfo } from './loop';
import { generateWatcher } from './watcher';
import { storeStateProvider } from './provider';

export function activate(context: vscode.ExtensionContext) {
  let rootPath = vscode.workspace.rootPath;
  if (rootPath === undefined) {
    console.log('no folder is opened');
    return;
  }
  let [storeAbsolutePath, stateKeysList] = setStoreInfo(rootPath);
  let watcher = generateWatcher(storeAbsolutePath);
  let stateProvider = new storeStateProvider(stateKeysList);

  watcher.on('change', () => {
    stateKeysList = setStoreInfo(rootPath)[1];
    stateProvider.setStateKeysList(stateKeysList);
  });

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider('vue', stateProvider, '.'),
  );
}
