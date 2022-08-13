import { BufferDispatcher } from '@universal-packages/buffer-dispatcher'
import EventEmitter from 'events'

import { ToEmit, ToolSet, Mutator, ProcessPathOptions, PathInfo, PathTraverse } from './State.types'

/**
 *
 * It represents and encapsulates a simple mapped state by offering a path
 * style API, you listen for a path for a change and you mutate the state using paths.
 *
 */
export default class State extends EventEmitter {
  public readonly state: any = {}

  /*
   * We use a buffer dispatcher so any motation made to the state from anywere
   * will be prioritazed ina queue fashion.
   */
  private bufferDispatcher = new BufferDispatcher<Mutator>(this.dispatchMutation.bind(this))

  /* The tool set provided to mutators, user should only mutate the state ushing these */
  private toolSet: ToolSet = {
    concat: this.toolSetConcat.bind(this),
    remove: this.toolSetRemove.bind(this),
    merge: this.toolSetMerge.bind(this),
    set: this.toolSetSet.bind(this),
    update: this.toolSetUpdate.bind(this)
  }

  /* After a mutation here resides all the detected paths that sgould be notified by a change */
  private toEmit: ToEmit = {}

  public constructor(initialState?: any) {
    super()

    this.state = initialState || {}
  }

  /* Push a single concat mutation into the queue */
  public concat(path: string | string[], value: any): BufferDispatcher<Mutator> {
    return this.mutate((toolset: ToolSet): void => {
      toolset.concat(path, value)
    })
  }

  /* Push a single remove mutation into the queue */
  public remove(path: string | string[]): BufferDispatcher<Mutator> {
    return this.mutate((toolset: ToolSet): void => {
      toolset.remove(path)
    })
  }

  /* Push a single merge mutation into the queue */
  public merge(path: string | string[], value: any): BufferDispatcher<Mutator> {
    return this.mutate((toolset: ToolSet): void => {
      toolset.merge(path, value)
    })
  }

  /* Push a single set mutation into the queue */
  public set(path: string | string[], value: any): BufferDispatcher<Mutator> {
    return this.mutate((toolset: ToolSet): void => {
      toolset.set(path, value)
    })
  }

  /* Push a single update mutation into the queue */
  public update<V = any>(path: string | string[], setter: (value: V) => V): BufferDispatcher<Mutator> {
    return this.mutate((toolset: ToolSet): void => {
      toolset.update(path, setter)
    })
  }

  /* Cleans app a path or bilds one from an array */
  public static getPath(path: string | string[]): string {
    const joined = `/${Array.isArray(path) ? path.join('/') : path}/`
    const striped = joined.replace(/\/+/gm, '/')

    return striped.slice(1, striped.length - 1)
  }

  /* It gets an element form the state using a path */
  public get(path: string | string[] = '', hard = false): any {
    const finalPath = State.getPath(path)
    const elements = this.getElements(finalPath)

    // We return the whole state if the path is empty
    if (elements.length === 1 && !elements[0]) return this.state

    let currentNode = this.state

    for (let i = 0; i < elements.length - 1; i++) {
      const currentElement = elements[i]

      // If the path is requiring us to keep advancing as if there was an object to keep advacing on
      // but we reach a value in the tree that does not work as a map, we can not deliver a value
      if (typeof currentNode[currentElement] !== 'object' || currentNode[currentElement] === null) {
        if (hard) {
          throw new Error("Can't get a value from an invalid path")
        } else {
          return undefined
        }
      }

      currentNode = currentNode[elements[i]]
    }

    return currentNode[elements[elements.length - 1]]
  }

  /**
   * It takes a mutator fuctions as a parameter to push into the mutations buffer
   * to be dispatched as soon as possible
   */
  public mutate(mutator: Mutator): BufferDispatcher<Mutator> {
    this.bufferDispatcher.append(mutator)

    return this.bufferDispatcher
  }

  /** Called by our buffer dispatcheer for every motator pushed to it and emits all pending emitions after every mutation */
  private dispatchMutation(mutator: Mutator): void {
    mutator(this.toolSet)

    const toEmitKeys = Object.keys(this.toEmit)

    for (let i = 0; i < toEmitKeys.length; i++) {
      this.emit(toEmitKeys[i], this.toEmit[toEmitKeys[i]])
    }

    this.toEmit = {}
  }

  /** Part of tool set will enable muatators to concat directly into state arrays  */
  private toolSetConcat(path: string | string[], value: any): void {
    const pathInfo = this.processPath(path)

    if (pathInfo.targetNodeIsRoot) {
      throw new Error('Invalid path to value')
    }

    for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
      const currentPathTraverse = pathInfo.pathTraverse[i]

      // Here we just maje shure we set emitions for every new child created in to the state tree
      if (currentPathTraverse.created) {
        const previousPathTraverse = pathInfo.pathTraverse[i - 1]

        this.toEmit['*'] = this.state

        if (previousPathTraverse && !previousPathTraverse.created) {
          this.toEmit[previousPathTraverse.path] = previousPathTraverse.node
        }

        this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
      }
    }

    // We enable concat to just behave as "set" if we are setting the taget for the first time
    // But if it alreary exists a target value in the tree and is not an array then we throw
    if (!pathInfo.targetNode[pathInfo.targetKey]) {
      pathInfo.targetNode[pathInfo.targetKey] = value
    } else if (Array.isArray(pathInfo.targetNode[pathInfo.targetKey])) {
      const currentArray = pathInfo.targetNode[pathInfo.targetKey] as any[]

      pathInfo.targetNode[pathInfo.targetKey] = currentArray.concat(value)
    } else {
      throw new Error('Target is not an array')
    }

    this.toEmit['*'] = this.state

    this.toEmit[pathInfo.path] = value
  }

  /** Part of tool set will enable muatators to remove a key value in the state  */
  private toolSetRemove(path: string | string[]): void {
    const pathInfo = this.processPath(path, { onlyCheck: true })

    if (pathInfo.targetNodeIsRoot) {
      throw new Error('Invalid path to value')
    }

    // Nothing to delete
    if (!pathInfo.targetNode) return

    delete pathInfo.targetNode[pathInfo.targetKey]

    const previousPath = pathInfo.pathTraverse[pathInfo.pathTraverse.length - 1]

    this.toEmit['*'] = this.state

    // If we deleted the taget node then the previous was modified by not having the target enymore
    if (previousPath && !previousPath.created) {
      this.toEmit[previousPath.path] = previousPath.node
    }

    this.toEmit[pathInfo.path] = undefined
  }

  /** Helper method cleans a path and returns it path elements */
  private getElements(path: string | string[]): string[] {
    return State.getPath(path).split('/')
  }

  /** Part of tool set will enable muatators to merge a map into the state or one of its nodes  */
  private toolSetMerge(treePath: string | string[], mergeable: any): void {
    const pathInfo = this.processPath(treePath)
    const mergeableKeys = Object.keys(mergeable)

    // When traing to merge into the root state we just merge and thats it
    if (pathInfo.targetNodeIsRoot) {
      this.toEmit['*'] = this.state

      for (let i = 0; i < mergeableKeys.length; i++) {
        const currentKey = mergeableKeys[i]

        if (pathInfo.targetNode[currentKey] !== mergeable[currentKey]) {
          pathInfo.targetNode[currentKey] = mergeable[currentKey]

          this.toEmit[currentKey] = pathInfo.targetNode[currentKey]
        }
      }
    } else {
      // If it is not a merge into the root state we continue by trying to get
      // the actual object in which we want to merge
      const pathInfo = this.processPath(treePath, { includeLast: true })

      if (pathInfo.error) throw new Error('Invalid path to value or target is not a mergeable object')

      for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
        const currentPathTraverse = pathInfo.pathTraverse[i]

        if (currentPathTraverse.created) {
          const previousPathTraverse = pathInfo.pathTraverse[i - 1]

          this.toEmit['*'] = this.state

          if (previousPathTraverse && !previousPathTraverse.created) {
            this.toEmit[previousPathTraverse.path] = previousPathTraverse.node
          }

          this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
        }
      }

      // We go through all meregeable keys and prepare to notify any listener of those keys
      for (let i = 0; i < mergeableKeys.length; i++) {
        const currentKey = mergeableKeys[i]

        if (pathInfo.targetNode[currentKey] !== mergeable[currentKey]) {
          pathInfo.targetNode[currentKey] = mergeable[currentKey]

          const previousPath = pathInfo.pathTraverse[pathInfo.pathTraverse.length - 1]

          this.toEmit['*'] = this.state

          if (previousPath && !previousPath.created) {
            this.toEmit[previousPath.path] = previousPath.node
          }

          this.toEmit[`${pathInfo.path}/${currentKey}`] = pathInfo.targetNode[currentKey]
        }
      }
    }
  }

  /** Part of tool set will enable muatators to set a value in any part of the state  */
  private toolSetSet(path: string | string[], value: any): void {
    const pathInfo = this.processPath(path)

    if (pathInfo.targetNodeIsRoot) throw new Error('Root state should not be directly set')
    if (pathInfo.error) throw new Error('Invalid path to value')

    for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
      const currentPathTraverse = pathInfo.pathTraverse[i]

      if (currentPathTraverse.created) {
        const previousPathTraverse = pathInfo.pathTraverse[i - 1]

        this.toEmit['*'] = this.state

        if (previousPathTraverse && !previousPathTraverse.created) {
          this.toEmit[previousPathTraverse.path] = previousPathTraverse.node
        }

        this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
      }
    }

    if (pathInfo.targetNode[pathInfo.targetKey] !== value) {
      pathInfo.targetNode[pathInfo.targetKey] = value

      const previousPathTraverse = pathInfo.pathTraverse[pathInfo.pathTraverse.length - 1]

      this.toEmit['*'] = this.state

      // We emit for previous since its contents changed
      // so in theory whatever is watching previous will be interested
      // in its new contents
      if (previousPathTraverse && !previousPathTraverse.created) {
        this.toEmit[previousPathTraverse.path] = previousPathTraverse.node
      }

      this.toEmit[pathInfo.path] = value
    }
  }

  /**
   * It goues thorug the path and matches the path with the state nodes,
   * it also creates any nodes in case the user is setting deep into the state
   * */
  private processPath(path: string | string[], options: ProcessPathOptions = { includeLast: false, onlyCheck: false }): PathInfo {
    const elements = this.getElements(path)
    const pathTraverse: PathTraverse[] = []
    const iterationLimit = options.includeLast ? elements.length : elements.length - 1
    const targetNodeIsRoot = elements.length === 1 && elements[0] === ''
    let currentNode = this.state
    let currentPath = ''
    let error = false

    for (let i = 0; i < iterationLimit; i++) {
      const currentElement = elements[i]
      const targetInNode = currentNode[currentElement]
      let created = false

      currentPath = `${currentPath}${currentPath !== '' ? '/' : ''}${currentElement}`

      // While going through the state using the path provided we realise we are about to go through a value
      // that is not an valid object(map) to go through
      if (typeof targetInNode !== 'object' || targetInNode === null) {
        // And we are still going through the state
        if (i < iterationLimit) {
          // And the target in node is not undefined (since is nothing there we can possible
          // initialize it, this as a feature when trying to set something deeply withut
          // the need of initializing level by level
          if (targetInNode === undefined) {
            if (options.onlyCheck) {
              currentNode = undefined
              error = true
              break
            }

            currentNode[currentElement] = {}

            created = true
          } else {
            error = true
            break
          }
        }
      }

      currentNode = currentNode[elements[i]]

      pathTraverse.push({ path: currentPath, node: currentNode, created })
    }

    return {
      elements,
      path: State.getPath(path),
      pathTraverse,
      targetKey: elements[elements.length - 1],
      targetNode: currentNode,
      targetNodeIsRoot,
      error
    }
  }

  private toolSetUpdate<V = any>(path: string | string[], setter: (value: V) => V): void {
    const pathInfo = this.processPath(path, { onlyCheck: true })

    if (pathInfo.targetNodeIsRoot || !pathInfo.targetNode) {
      throw new Error('Invalid path to value')
    }

    const previousValue = pathInfo.targetNode[pathInfo.targetKey] as V
    const newValue = setter(previousValue)

    // We do not check if the value actually changed
    // because the update could has changed an object refrence
    // and we could receive the same reference
    pathInfo.targetNode[pathInfo.targetKey] = newValue

    const previousPath = pathInfo.pathTraverse[pathInfo.pathTraverse.length - 1]

    this.toEmit[pathInfo.path] = newValue
    this.toEmit['*'] = this.state

    if (previousPath) {
      this.toEmit[previousPath.path] = previousPath.node
    }

    this.toEmit[pathInfo.path] = newValue
  }
}
