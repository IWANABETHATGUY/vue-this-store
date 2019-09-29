import { GetterInfo } from '../normal/modules';
import {
  VariableDeclarator,
  isObjectExpression,
	isObjectMethod,
} from '@babel/types';

export function parseNuxtGetters(
  declarator: VariableDeclarator,
  sourceCode: string,
): GetterInfo[] {
  let gettersInfoList: GetterInfo[] = [];
  if (isObjectExpression(declarator.init)) {
    const objectExpression = declarator.init;
    objectExpression.properties.forEach(property => {
      if (isObjectMethod(property)) {
        gettersInfoList.push({
          identifier: property.key.name,
          defination: sourceCode.slice(property.start, property.end),
        });
      }
    });
  }
  return gettersInfoList;
}
