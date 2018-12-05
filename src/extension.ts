/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
// import { vueStoreStateProviderFunciton } from './provider';
import VueThis$Store from './loop';

export function activate(context: vscode.ExtensionContext) {
  console.time('generateState');

  let rootPath = vscode.workspace.rootPath;

  new VueThis$Store(context, rootPath);
  //init provider

  console.timeEnd('generateState');
}
