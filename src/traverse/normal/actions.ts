import {
  getAbsolutePath,
  getFileContent,
  getFileDefinationAstMap,
  getModuleOrPathMap,
  transformShorthand,
} from '../../util/traverseUtil';
import {
  ExportDefaultDeclaration,
  objectExpression,
  ObjectExpression,
  ObjectProperty,
  ObjectMethod,
  Identifier,
  VariableDeclarator,
  StringLiteral,
  BaseNode,
} from '@babel/types';
import traverse from '@babel/traverse';
import { getAstOfCode } from '../../util/commonUtil';
import { ActionInfo } from './modules';
function evalFromPath(base: string, relative: string, evalMap) {
  let filename = getAbsolutePath(base, relative);
  let fileContent = getFileContent(filename);
  let ast = getAstOfCode(fileContent);
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
export function walkActionsFile(base: string, relative: string = '') {
  let filename = getAbsolutePath(base, relative);
  let fileContent = getFileContent(filename);
  let ast = getAstOfCode(fileContent);
  let defineAstMap = getFileDefinationAstMap(ast);
  let moduleOrPathMap = getModuleOrPathMap(ast);
  let exportDefault: ExportDefaultDeclaration = ast.program.body.filter(
    item => item.type === 'ExportDefaultDeclaration',
  )[0] as ExportDefaultDeclaration;
  transformShorthand(exportDefault, defineAstMap);
  if (exportDefault) {
    let EvalMap = {};
    let pathSet = new Set<string>();
    (exportDefault.declaration as ObjectExpression).properties.forEach(
      (property: ObjectMethod) => {
        let key: Identifier = property.key;
        if (property.computed) {
          if (defineAstMap[key.name]) {
            property.key.name = ((defineAstMap[key.name] as VariableDeclarator)
              .init as StringLiteral).value;
          } else if (moduleOrPathMap[key.name]) {
            EvalMap[key.name] = '';
            pathSet.add(moduleOrPathMap[key.name]);
          }
        }
      },
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

export function parseActions(objAst: ObjectExpression, lineOfFile: string[]) {
  let actionInfoList: ActionInfo[] = [];
  const content = lineOfFile.join('\n');
  // debugger;
  objAst.properties.forEach((property: ObjectMethod | ObjectProperty) => {
    let loc = property.loc;
    let params: BaseNode[];
    if (property.type === 'ObjectMethod') {
      params = property.params;
    } else if (
      property.type === 'ObjectProperty' &&
      property.value.type === 'ArrowFunctionExpression'
    ) {
      params = property.value.params;
    }
    let paramList = params.map(param => content.slice(param.start, param.end));

    actionInfoList.push({
      identifier: property.key.name,
      defination: lineOfFile.slice(loc.start.line - 1, loc.end.line).join('\n'),
      params: paramList,
      functionDeclarator: `${(property.key as Identifier).name} (${paramList.join(
        ', ',
      )})`,
    });
  });
  return actionInfoList;
}
