import { GetterInfo, StoreTreeInfo } from '../normal/modules';
import {
  VariableDeclarator,
  isObjectExpression,
	isObjectMethod,
} from '@babel/types';

export function parseNuxtGetters(
  declarator: VariableDeclarator,
  sourceCode: string,
  parent: StoreTreeInfo
): GetterInfo[] {
  let gettersInfoList: GetterInfo[] = [];
  if (isObjectExpression(declarator.init)) {
    const objectExpression = declarator.init;
    objectExpression.properties.forEach(property => {
      if (isObjectMethod(property)) {
        gettersInfoList.push({
          identifier: property.key.name,
          defination: sourceCode.slice(property.start, property.end),
          parent,
        });
      }
    });
  }
  return gettersInfoList;
}
