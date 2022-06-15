export type Mutator = (toolset: ToolSet) => void

export interface ToEmit {
  [eventName: string]: any
}

export interface ToolSet {
  concat: (path: string | string[], value: any[]) => void
  merge: (path: string | string[], object: any) => void
  remove: (path: string | string[]) => void
  set: (path: string | string[], value: any) => void
  update<V = any>(path: string | string[], setter: (value: V) => V): void
}

export interface ProcessPathOptions {
  includeLast?: boolean
  onlyCheck?: boolean
}

export interface PathInfo {
  elements: string[]
  path: string
  pathTraverse: PathTraverse[]
  targetKey: string
  targetNode: any
  targetNodeIsRoot: boolean
  error: boolean
}

export interface PathTraverse {
  path: string
  node: any
  created?: boolean
}
