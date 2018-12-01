import * as vscode from 'vscode';

// import { stateKeysList } from './extension';

// export const storeStateProvider = vscode.languages.registerCompletionItemProvider(
//   { language: 'vue' },
//   {
//     provideCompletionItems(
//       document: vscode.TextDocument,
//       position: vscode.Position,
//     ) {
//       // get all text until the `position` and check if it reads `console.`
//       // and iff so then complete if `log`, `warn`, and `error`
//       let linePrefix = document
//         .lineAt(position)
//         .text.substr(0, position.character);
//       let trimLinePrefix = linePrefix.trim();
//       let reg = /(return this)?(.$store)?state/;
//       if (!reg.test(trimLinePrefix)) {
//         return undefined;
//       }

//       return stateKeysList.map(stateKey => {
//         return new vscode.CompletionItem(
//           stateKey,
//           vscode.CompletionItemKind.Property,
//         );
//       });
//     },
//   },
//   '.', // triggered whenever a '.' is being typed
// );
