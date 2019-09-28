import { BaseNode } from '@babel/types';

export interface StateInfo {
  stateKey: string;
  defination: string;
}

interface FileInfo {
  abPath: string;
}
export interface StoreInfo extends FileInfo {
  state: StateInfo[];
  modules?: ModulesInfo;
  [propname: string]: any;
}

export interface ModulesInfo extends FileInfo {
  [propname: string]: string | Module;
}

export interface Module {
  namespace?: boolean;
}
/**
 * 
 * 
 * @export
 * @interface ModuleOrPathMap
 */
export interface ModuleOrPathMap {
  [localIdentifier: string]: string;
}

export interface StoreAstMap {
  [propname: string]: BaseNode;
}
// 生成store的树状信息状态，-1 代表失败， 1代表成功
export type StatusBarItemStatus = -1 | 1 | 0;
