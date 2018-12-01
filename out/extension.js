/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const util_1 = require("./util");
function activate(context) {
    let rootPath = vscode.workspace.rootPath;
    if (rootPath === undefined) {
        console.log('no folder is opened');
        return;
    }
    let entry = path.resolve(rootPath, 'src/main.js');
    if (!fs.existsSync(entry)) {
        console.error("you don't have the entry file");
        return;
    }
    let entryFileContent = util_1.getFileContent(entry);
    let entryFileContentAst = util_1.getAstOfCode(entryFileContent);
    let storeRelativePath = util_1.getStoreEntryRelativePath(entryFileContentAst);
    let storeContent = util_1.getFileContent(path.dirname(entry), storeRelativePath);
    let stateKeysList = util_1.getStateKeysFromStore(storeContent);
    let provider1 = vscode.languages.registerCompletionItemProvider('plaintext', {
        provideCompletionItems(document, position, token, context) {
            // a simple completion item which inserts `Hello World!`
            const simpleCompletion = new vscode.CompletionItem('Hello World!');
            // a completion item that inserts its text as snippet,
            // the `insertText`-property is a `SnippetString` which we will
            // honored by the editor.
            const snippetCompletion = new vscode.CompletionItem('Good part of the day');
            snippetCompletion.insertText = new vscode.SnippetString('Good ${1|morning,afternoon,evening|}. It is ${1}, right?');
            snippetCompletion.documentation = new vscode.MarkdownString('Inserts a snippet that lets you select the _appropriate_ part of the day for your greeting.');
            // a completion item that can be accepted by a commit character,
            // the `commitCharacters`-property is set which means that the completion will
            // be inserted and then the character will be typed.
            const commitCharacterCompletion = new vscode.CompletionItem('console');
            commitCharacterCompletion.commitCharacters = ['.'];
            commitCharacterCompletion.documentation = new vscode.MarkdownString('Press `.` to get `console.`');
            // a completion item that retriggers IntelliSense when being accepted,
            // the `command`-property is set which the editor will execute after
            // completion has been inserted. Also, the `insertText` is set so that
            // a space is inserted after `new`
            const commandCompletion = new vscode.CompletionItem('new');
            commandCompletion.kind = vscode.CompletionItemKind.Keyword;
            commandCompletion.insertText = 'new ';
            commandCompletion.command = {
                command: 'editor.action.triggerSuggest',
                title: 'Re-trigger completions...',
            };
            // return all completion items as array
            return [
                simpleCompletion,
                snippetCompletion,
                commitCharacterCompletion,
                commandCompletion,
            ];
        },
    });
    const vueStoreStateProvider = vscode.languages.registerCompletionItemProvider('vue', {
        provideCompletionItems(document, position) {
            // get all text until the `position` and check if it reads `console.`
            // and iff so then complete if `log`, `warn`, and `error`
            let linePrefix = document
                .lineAt(position)
                .text.substr(0, position.character);
            let trimLinePrefix = linePrefix.trim();
            let reg = /(return this)?(.$store)?state/;
            if (!reg.test(trimLinePrefix)) {
                return undefined;
            }
            return stateKeysList.map(stateKey => {
                return new vscode.CompletionItem(stateKey, vscode.CompletionItemKind.Property);
            });
        },
    }, '.');
    context.subscriptions.push(provider1, vueStoreStateProvider);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map