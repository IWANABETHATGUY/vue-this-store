import {
  getAbsolutePath,
  getFileContent,
  getAst,
  getFileDefinationAstMap,
  getModuleOrPathMap,
} from './utils';
import {
  ExportDefaultDeclaration,
  objectExpression,
  ObjectExpression,
  ObjectProperty,
  ObjectMethod,
  Identifier,
  VariableDeclarator,
  StringLiteral,
} from '@babel/types';
import traverse from '@babel/traverse';
function evalFromPath(base: string, relative: string, evalMap) {
  let filename = getAbsolutePath(base, relative);
  let fileContent = getFileContent(filename);
  let ast = getAst(fileContent);
  traverse(ast, {
    VariableDeclarator(path) {
      let node: VariableDeclarator = path.node;
      let id: Identifier = node.id as Identifier;
      let init = node.init;
      if (init.type === 'StringLiteral') {
        if (evalMap[id.name] === '') {
          evalMap[id.name] = init.value;
        }
      }
    },
  });
}
export function walkMutationsFile(base: string, relative: string = '') {
  let filename = getAbsolutePath(base, relative);
  let fileContent = getFileContent(filename);
  let ast = getAst(fileContent);
  let defineAstMap = getFileDefinationAstMap(ast);
  let moduleOrPathMap = getModuleOrPathMap(ast);
  let exportDefault: ExportDefaultDeclaration = ast.program.body.filter(
    item => item.type === 'ExportDefaultDeclaration',
  )[0] as ExportDefaultDeclaration;
  if (exportDefault) {
    let EvalMap = {};
    (exportDefault.declaration as ObjectExpression).properties.forEach(
      (property: ObjectMethod) => {
        let key: Identifier = property.key;
        if (property.computed) {
          if (defineAstMap[key.name]) {
            property.key.name = ((defineAstMap[key.name] as VariableDeclarator)
              .init as StringLiteral).value;
          } else {
            EvalMap[key.name] = '';
          }
        }
      },
    );
    let pathSet = new Set(
      Object.keys(moduleOrPathMap).map(key => moduleOrPathMap[key]),
    );
    pathSet.forEach(path => {
      evalFromPath(base, path, EvalMap);
    });
    (exportDefault.declaration as ObjectExpression).properties.forEach(
      (property: ObjectMethod) => {
        let key: Identifier = property.key;
        if (property.computed) {
          if (EvalMap[key.name]) {
            property.key.name = EvalMap[key.name];
          }
        }
      },
    );
  }
  return {
    export: exportDefault
      ? (exportDefault.declaration as ObjectExpression)
      : (objectExpression([]) as ObjectExpression),
    lineOfFile: fileContent.split('\n'),
  };
}

export function parseMutations(objAst: ObjectExpression, lileOfFile: string[]) {
  let getterInfoList = [];
  objAst.properties.forEach((property: ObjectProperty) => {
    let loc = property.loc;
    getterInfoList.push({
      rowKey: property.key.name,
      defination: lileOfFile.slice(loc.start.line - 1, loc.end.line).join('\n'),
    });
  });
  return getterInfoList;
}
