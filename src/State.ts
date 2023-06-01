import { BufferDispatcher } from '@universal-packages/buffer-dispatcher'
import EventEmitter from 'events'

import { Mutator, PathInfo, PathTraverse, ProcessPathOptions, ToEmit, ToolSet } from './State.types'

/**
 *
 * It represents and encapsulates a simple mapped state by offering a path
 * style API, you listen for a path for a change and you mutate the state using paths.
 *
 */
export default class State extends EventEmitter {
  public readonly state: any = {}

  /*
   * We use a buffer dispatcher so any mutation made to the state from anywhere
   * will be prioritized ina queue fashion.
   */
  private bufferDispatcher = new BufferDispatcher<Mutator>(this.dispatchMutation.bind(this))

  /* The tool set provided to mutators, user should only mutate the state using these */
  private toolSet: ToolSet = {
    concat: this.toolSetConcat.bind(this),
    remove: this.toolSetRemove.bind(this),
    merge: this.toolSetMerge.bind(this),
    set: this.toolSetSet.bind(this),
    update: this.toolSetUpdate.bind(this)
  }

  /* After a mutation here resides all the detected paths that should be notified by a change */
  private toEmit: ToEmit = {}

  public constructor(initialState?: any) {
    super()

    this.state = initialState || {}
  }

  /* Clears the states and emits to all listeners since all changed */
  public clear(): void {
    const keys = Object.keys(this.state)

    for (let i = 0; i < keys.length; i++) {
      delete this.state[keys[i]]
    }

    const subscribersEventNames = this.eventNames()

    for (let i = 0; i < subscribersEventNames.length; i++) {
      this.emit(subscribersEventNames[i], this.state)
    }
  }

  /* Push a single concat mutation into the queue */
  public concat(path: string | string[], value: any): BufferDispatcher<Mutator> {
    return this.mutate((toolSet: ToolSet): void => {
      toolSet.concat(path, value)
    })
  }

  /* Push a single remove mutation into the queue */
  public remove(path: string | string[]): BufferDispatcher<Mutator> {
    return this.mutate((toolSet: ToolSet): void => {
      toolSet.remove(path)
    })
  }

  /* Push a single merge mutation into the queue */
  public merge(path: string | string[], value: any): BufferDispatcher<Mutator> {
    return this.mutate((toolSet: ToolSet): void => {
      toolSet.merge(path, value)
    })
  }

  /* Push a single set mutation into the queue */
  public set(path: string | string[], value: any): BufferDispatcher<Mutator> {
    return this.mutate((toolSet: ToolSet): void => {
      toolSet.set(path, value)
    })
  }

  /* Push a single update mutation into the queue */
  public update<V = any>(path: string | string[], setter: (value: V) => V): BufferDispatcher<Mutator> {
    return this.mutate((toolSet: ToolSet): void => {
      toolSet.update(path, setter)
    })
  }

  /* Cleans app a path or builds one from an array */
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

      // If the path is requiring us to keep advancing as if there was an object to keep advancing on
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
   * It takes a mutator functions as a parameter to push into the mutations buffer
   * to be dispatched as soon as possible
   */
  public mutate(mutator: Mutator): BufferDispatcher<Mutator> {
    this.bufferDispatcher.append(mutator)

    return this.bufferDispatcher
  }

  /** Called by our buffer dispatcher for every mutator pushed to it and emits all pending emits after every mutation */
  private dispatchMutation(mutator: Mutator): void {
    mutator(this.toolSet)

    const toEmitKeys = Object.keys(this.toEmit)

    for (let i = 0; i < toEmitKeys.length; i++) {
      this.emit(toEmitKeys[i], this.toEmit[toEmitKeys[i]])
    }

    this.toEmit = {}
  }

  /** Part of tool set will enable mutators to concat directly into state arrays  */
  private toolSetConcat(path: string | string[], value: any): void {
    const pathInfo = this.processPath(path)

    if (pathInfo.targetNodeIsRoot) {
      throw new Error('Invalid path to value')
    }

    // We enable concat to just behave as "set" if we are setting the target for the first time
    // But if it already exists a target value in the tree and is not an array then we throw
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

    // We emit to al listeners in the path under the concept of if something inside them changed
    // Then they are interested in the change, listeners decide if they want to act on the change
    for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
      const currentPathTraverse = pathInfo.pathTraverse[i]
      this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
    }

    // If something is listening further down the tree we also emit to them
    // since they could have disappeared or appeared
    const subscribersEventNames = this.eventNames()
    for (let i = 0; i < subscribersEventNames.length; i++) {
      const currentEventName = subscribersEventNames[i] as string

      if (currentEventName !== pathInfo.path && currentEventName.startsWith(pathInfo.path)) {
        this.toEmit[currentEventName] = this.get(currentEventName)
      }
    }
  }

  /** Part of tool set will enable mutators to remove a key value in the state  */
  private toolSetRemove(path: string | string[]): void {
    const pathInfo = this.processPath(path, { onlyCheck: true })

    if (pathInfo.targetNodeIsRoot) {
      throw new Error('Invalid path to value')
    }

    // Nothing to delete
    if (!pathInfo.targetNode) return

    delete pathInfo.targetNode[pathInfo.targetKey]

    this.toEmit['*'] = this.state
    this.toEmit[pathInfo.path] = undefined

    // We emit to al listeners in the path under the concept of if something inside them changed
    // Then they are interested in the change, listeners decide if they want to act on the change
    for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
      const currentPathTraverse = pathInfo.pathTraverse[i]
      this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
    }

    // If we deleted a container then all its children were modified by not having the container anymore
    const subscribersEventNames = this.eventNames()
    for (let i = 0; i < subscribersEventNames.length; i++) {
      const currentEventName = subscribersEventNames[i] as string

      if (currentEventName !== pathInfo.path && currentEventName.startsWith(pathInfo.path)) {
        this.toEmit[currentEventName] = undefined
      }
    }
  }

  /** Helper method cleans a path and returns it path elements */
  private getElements(path: string | string[]): string[] {
    return State.getPath(path).split('/')
  }

  /** Part of tool set will enable mutators to merge a map into the state or one of its nodes  */
  private toolSetMerge(treePath: string | string[], mergeSubject: any): void {
    const pathInfo = this.processPath(treePath)
    const mergeSubjectKeys = Object.keys(mergeSubject)

    // When trying to merge into the root state we just merge and thats it
    if (pathInfo.targetNodeIsRoot) {
      this.toEmit['*'] = this.state

      for (let i = 0; i < mergeSubjectKeys.length; i++) {
        const currentKey = mergeSubjectKeys[i]

        if (pathInfo.targetNode[currentKey] !== mergeSubject[currentKey]) {
          pathInfo.targetNode[currentKey] = mergeSubject[currentKey]

          this.toEmit[currentKey] = pathInfo.targetNode[currentKey]

          // When merged the the insides changes with potential deep children
          const subscribersEventNames = this.eventNames()
          for (let i = 0; i < subscribersEventNames.length; i++) {
            const currentEventName = subscribersEventNames[i] as string

            if (currentEventName !== currentKey && currentEventName.startsWith(currentKey)) {
              this.toEmit[currentEventName] = this.get(currentEventName)
            }
          }
        }
      }
    } else {
      // If it is not a merge into the root state we continue by trying to get
      // the actual object in which we want to merge
      const pathInfo = this.processPath(treePath, { includeLast: true })

      if (pathInfo.error) throw new Error('Invalid path to value or target is not an object that can bve merged')

      // We go through all merge subject keys and prepare to notify any listener of those keys
      for (let i = 0; i < mergeSubjectKeys.length; i++) {
        const currentKey = mergeSubjectKeys[i]

        if (pathInfo.targetNode[currentKey] !== mergeSubject[currentKey]) {
          pathInfo.targetNode[currentKey] = mergeSubject[currentKey]

          this.toEmit['*'] = this.state
          this.toEmit[`${pathInfo.path}/${currentKey}`] = pathInfo.targetNode[currentKey]

          // We emit to al listeners in the path under the concept of if something inside them changed
          // Then they are interested in the change, listeners decide if they want to act on the change
          for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
            const currentPathTraverse = pathInfo.pathTraverse[i]
            this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
          }

          // When merged the the insides changes with potential deep children
          const subscribersEventNames = this.eventNames()
          for (let i = 0; i < subscribersEventNames.length; i++) {
            const currentEventName = subscribersEventNames[i] as string

            if (currentEventName !== `${pathInfo.path}/${currentKey}` && currentEventName.startsWith(`${pathInfo.path}/${currentKey}`)) {
              this.toEmit[currentEventName] = this.get(currentEventName)
            }
          }
        }
      }
    }
  }

  /** Part of tool set will enable mutators to set a value in any part of the state  */
  private toolSetSet(path: string | string[], value: any): void {
    const pathInfo = this.processPath(path)

    if (pathInfo.targetNodeIsRoot) throw new Error('Root state should not be directly set')
    if (pathInfo.error) throw new Error('Invalid path to value')

    if (pathInfo.targetNode[pathInfo.targetKey] !== value) {
      pathInfo.targetNode[pathInfo.targetKey] = value

      this.toEmit['*'] = this.state
      this.toEmit[pathInfo.path] = value

      // We emit to al listeners in the path under the concept of if something inside them changed
      // Then they are interested in the change, listeners decide if they want to act on the change
      for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
        const currentPathTraverse = pathInfo.pathTraverse[i]
        this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
      }

      // If we set something in a container then all its children were potentially modified
      const subscribersEventNames = this.eventNames()
      for (let i = 0; i < subscribersEventNames.length; i++) {
        const currentEventName = subscribersEventNames[i] as string

        if (currentEventName !== pathInfo.path && currentEventName.startsWith(pathInfo.path)) {
          this.toEmit[currentEventName] = this.get(currentEventName)
        }
      }
    }
  }

  /**
   * It goes thorough the path and matches the path with the state nodes,
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

      // While going through the state using the path provided we realize we are about to go through a value
      // that is not an valid object(map) to go through
      if (typeof targetInNode !== 'object' || targetInNode === null) {
        // And we are still going through the state
        if (i < iterationLimit) {
          // And the target in node is not undefined (since is nothing there we can possible
          // initialize it, this as a feature when trying to set something deeply without
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
    // because the update could has changed an object reference
    // and we could receive the same reference
    pathInfo.targetNode[pathInfo.targetKey] = newValue

    this.toEmit[pathInfo.path] = newValue
    this.toEmit['*'] = this.state

    // We emit to al listeners in the path under the concept of if something inside them changed
    // Then they are interested in the change, listeners decide if they want to act on the change
    for (let i = 0; i < pathInfo.pathTraverse.length; i++) {
      const currentPathTraverse = pathInfo.pathTraverse[i]
      this.toEmit[currentPathTraverse.path] = currentPathTraverse.node
    }

    // If we update a container then all its children were potentially modified
    const subscribersEventNames = this.eventNames()
    for (let i = 0; i < subscribersEventNames.length; i++) {
      const currentEventName = subscribersEventNames[i] as string

      if (currentEventName !== pathInfo.path && currentEventName.startsWith(pathInfo.path)) {
        this.toEmit[currentEventName] = this.get(currentEventName)
      }
    }
  }
}
