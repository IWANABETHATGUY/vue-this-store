export interface StateInfo {
  stateKey: string;
  defination: string;
}

export interface ModuleInfo {
  state: StateInfo[];
  modules?: ModuleInfo;
}
// -1 代表失败， 1代表成功
export type Status = -1 | 1;
