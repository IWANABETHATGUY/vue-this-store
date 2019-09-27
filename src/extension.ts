'use strict';

import * as vscode from 'vscode';
import VueThis$Store from './loop';

export function activate(context: vscode.ExtensionContext) {
  console.time('generateState');
  let rootPath = vscode.workspace.rootPath;

  new VueThis$Store(context, rootPath);
  console.timeEnd('generateState');
}
