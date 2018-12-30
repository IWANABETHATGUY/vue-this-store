'use strict';

import * as vscode from 'vscode';
import VueThis$Store from './loop';
import { mutationsSignatureProvider } from './signature/mutationsProvider';

export function activate(context: vscode.ExtensionContext) {
  console.time('generateState');

  let rootPath = vscode.workspace.rootPath;

  new VueThis$Store(context, rootPath);
  console.timeEnd('generateState');
}
