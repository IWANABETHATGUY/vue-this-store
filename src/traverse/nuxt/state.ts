import { StateInfo } from '../normal/modules';
import {
  VariableDeclarator,
  isArrowFunctionExpression,
  isObjectExpression,
  isObjectProperty,
  isIdentifier,
  isBlockStatement,
  ReturnStatement,
  isReturnStatement,
} from '@babel/types';

export function parseNuxtState(
  declarator: VariableDeclarator,
  sourceCode: string,
): StateInfo[] {
  const stateInfoList: StateInfo[] = [];
  if (isArrowFunctionExpression(declarator.init)) {
    const arrowFucntion = declarator.init;
    if (isObjectExpression(arrowFucntion.body)) {
      const objectExpression = arrowFucntion.body;
      objectExpression.properties.forEach(property => {
        if (isObjectProperty(property) && isIdentifier(property.key)) {
          stateInfoList.push({
            identifier: property.key.name,
            defination: sourceCode.slice(property.start, property.end),
          });
        }
      });
    } else if (isBlockStatement(arrowFucntion.body)) {
      const returnStatement: ReturnStatement[] = arrowFucntion.body.body.filter(
        statement => {
          return isReturnStatement(statement);
        },
      ) as ReturnStatement[];
      if (returnStatement.length) {
        if (isObjectExpression(returnStatement[0].argument)) {
          const objectExpression = returnStatement[0].argument;
          objectExpression.properties.forEach(property => {
            if (isObjectProperty(property) && isIdentifier(property.key)) {
              stateInfoList.push({
                identifier: property.key.name,
                defination: sourceCode.slice(property.start, property.end),
              });
            }
          });
        }
      }
    }
  }
  return stateInfoList;
}
