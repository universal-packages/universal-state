import { State, ToolSet } from '../src'

describe('State', (): void => {
  it('it can have an initial state', async (): Promise<void> => {
    const state = new State({ initial: 'value' })

    expect(state.get()).toEqual({ initial: 'value' })
    expect(state.get('initial')).toEqual('value')
  })

  it('it can have a default empty state', async (): Promise<void> => {
    const state = new State()

    expect(state.get()).toEqual({})
  })

  describe('#getPath', (): void => {
    it('runs a string path or joined if array', async (): Promise<void> => {
      expect(State.getPath('/cosas')).toEqual('cosas')
      expect(State.getPath('/cosas//////////')).toEqual('cosas')
      expect(State.getPath('  /////cosas//////////   ')).toEqual('  /cosas/   ')
      expect(State.getPath(['cosas', 'mas cosas'])).toEqual('cosas/mas cosas')
      expect(State.getPath('  /////cos/   / addd  /as//////////   ')).toEqual('  /cos/   / addd  /as/   ')
      expect(State.getPath('/expected//kind/of/path')).toEqual('expected/kind/of/path')
    })
  })

  describe('.clear', (): void => {
    it('clears the state', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)
      const eventAll = jest.fn()
      const eventPosts = jest.fn()
      const eventUsers1 = jest.fn()

      state.on('*', eventAll)
      state.on('posts', eventPosts)
      state.on('users/old/0', eventUsers1)
      state.clear()

      expect(state.get()).toEqual({})
      expect(eventAll).toHaveBeenCalledTimes(1)
      expect(eventPosts).toHaveBeenCalledTimes(1)
      expect(eventUsers1).toHaveBeenCalledTimes(1)
    })
  })

  describe('.get', (): void => {
    it('returns the value in the given path of the state', async (): Promise<void> => {
      const posts = { new: [{ id: 1 }, { id: 2 }] }
      const users = { old: [{ id: 3 }, { id: 4 }] }
      const initialState = { posts, users }
      const state = new State(initialState)

      expect(state.get()).toEqual(initialState)
      expect(state.get('')).toEqual(initialState)
      expect(state.get('/')).toEqual(initialState)
      expect(state.get('/posts')).toEqual(posts)
      expect(state.get('/posts/new')).toEqual(posts.new)
      expect(state.get('/posts//new/0')).toEqual(posts.new[0])
      expect(state.get('/posts//new/1')).toEqual(posts.new[1])
      expect(state.get('/posts//new/0/id')).toEqual(posts.new[0].id)
      expect(state.get('/posts//new/1/id')).toEqual(posts.new[1].id)

      expect(state.get('/users')).toEqual(users)
      expect(state.get('/users/old')).toEqual(users.old)
      expect(state.get('/users//old/0')).toEqual(users.old[0])
      expect(state.get('/users//old/1')).toEqual(users.old[1])
      expect(state.get('/users//old/0/id')).toEqual(users.old[0].id)
      expect(state.get('/users//old/1/id')).toEqual(users.old[1].id)

      expect(state.get('/not/a/path/to/something')).toEqual(undefined)
    })

    it('throws if not valid path is provided and hard is set to true', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)

      let error: Error
      try {
        state.get('/users//cat/1/name', true)
      } catch (err) {
        error = err
      }
      expect(error).toEqual(new Error("Can't get a value from an invalid path"))
    })
  })

  describe('single actions', (): void => {
    describe('.set', (): void => {
      it('sets new values in deep paths', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        await state.set('/posts/old/', [{ id: 100 }]).await()
        expect(state.get('posts/old')).toEqual([{ id: 100 }])
      })
    })

    describe('.delete', (): void => {
      it('deletes a value in a deep path', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        await state.remove('/posts/new/0/id').await()
        expect(state.get('posts')).toEqual({ new: [{}, { id: 2 }] })
      })
    })

    describe('.concat', (): void => {
      it('concatenate arrays in the tree', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        await state.concat('/posts/new/', [{ id: 100 }]).await()
        expect(state.get('posts/new')).toEqual([{ id: 1 }, { id: 2 }, { id: 100 }])
      })
    })

    describe('.merge', (): void => {
      it('merges objects in the tree', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        await state.merge('/posts/', { old: [{ id: 100 }] }).await()
        expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }] })
      })
    })

    describe('.update', (): void => {
      it('updates a node in the state through the provided callback', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        await state
          .update('/posts/new/0', (first: any): any => {
            first.name = 'yes'

            return first
          })
          .await()
        expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }] })
      })
    })
  })

  describe('.mutate', (): void => {
    describe('testing tool set and events', (): void => {
      describe('.set', (): void => {
        it('sets new values in deep paths', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventPosts = jest.fn()
          const eventOld = jest.fn()
          const eventAt0 = jest.fn()
          const eventId = jest.fn()
          const eventMore = jest.fn()
          const eventDeep = jest.fn()

          state.on('*', eventAll)
          state.on('posts', eventPosts)
          state.on('posts/old', eventOld)
          state.on('posts/old/0', eventAt0)
          state.on('posts/old/0/id', eventId)
          state.on('posts/more', eventMore)
          state.on('posts/more/deep', eventDeep)

          let dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.set('/posts/old/', [{ id: 100 }])
          })
          await dispatcher.await()
          expect(state.get('posts/old')).toEqual([{ id: 100 }])

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // posts changed because its contents changed
          expect(eventOld).toHaveBeenCalledTimes(1) // old was created so it changed
          expect(eventAt0).toHaveBeenCalledTimes(1) // it appeared
          expect(eventId).toHaveBeenCalledTimes(1) // it appeared

          eventAll.mockClear()
          eventPosts.mockClear()
          eventOld.mockClear()
          eventAt0.mockClear()
          eventId.mockClear()
          eventMore.mockClear()
          eventDeep.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.set('/posts/old/0/id', 200)
          })
          await dispatcher.await()
          expect(state.get('posts/old')).toEqual([{ id: 200 }])

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
          expect(eventOld).toHaveBeenCalledTimes(1) // Potentially interested
          expect(eventAt0).toHaveBeenCalledTimes(1) // 0 contents changes so it was emitted
          expect(eventId).toHaveBeenCalledTimes(1) // of course id changed

          eventAll.mockClear()
          eventPosts.mockClear()
          eventOld.mockClear()
          eventAt0.mockClear()
          eventId.mockClear()
          eventMore.mockClear()
          eventDeep.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.set('/posts/more/deep/id', 200)
          })
          await dispatcher.await()
          expect(state.get('posts/more/deep/id')).toEqual(200)

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // it insides changed
          expect(eventOld).toHaveBeenCalledTimes(0) // is the same
          expect(eventMore).toHaveBeenCalledTimes(1) // was created
          expect(eventDeep).toHaveBeenCalledTimes(1) // was created
        })

        it('throws if part of the path is not a map to go thorough', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            let dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.set('/posts/new/0/id/1/more/deep', 200)
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Invalid path to value'))
        })

        it('throws if trying to set the root state', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            const dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.set('', [{ id: 100 }])
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Root state should not be directly set'))
        })
      })

      describe('.delete', (): void => {
        it('deletes a value in a deep path', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventPosts = jest.fn()
          const eventNew = jest.fn()
          const eventAt0 = jest.fn()
          const eventId = jest.fn()

          state.on('*', eventAll)
          state.on('posts', eventPosts)
          state.on('posts/new', eventNew)
          state.on('posts/new/0', eventAt0)
          state.on('posts/new/0/id', eventId)

          let dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.remove('/posts/new/0/id')
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{}, { id: 2 }] })
          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
          expect(eventNew).toHaveBeenCalledTimes(1) // Potentially interested
          expect(eventAt0).toHaveBeenCalledTimes(1) // 0 contents changes so it was emitted
          expect(eventAt0).toHaveBeenCalledWith({})
          expect(eventId).toHaveBeenCalledTimes(1) // id was deleted so it technically changed
          expect(eventId).toHaveBeenCalledWith(undefined)

          eventAll.mockClear()
          eventPosts.mockClear()
          eventNew.mockClear()
          eventAt0.mockClear()
          eventId.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.remove('/posts/old/0/id')
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{}, { id: 2 }] })
          expect(eventAll).toHaveBeenCalledTimes(0) // Nothing changed
          expect(eventPosts).toHaveBeenCalledTimes(0) // Nothing changed
          expect(eventNew).toHaveBeenCalledTimes(0) // Nothing changed
          expect(eventAt0).toHaveBeenCalledTimes(0) // Nothing changed
          expect(eventId).toHaveBeenCalledTimes(0) // Nothing changed

          eventAll.mockClear()
          eventPosts.mockClear()
          eventNew.mockClear()
          eventAt0.mockClear()
          eventId.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.remove('/posts')
          })

          expect(state.get('posts')).toEqual(undefined)
          expect(eventAll).toHaveBeenCalledTimes(1) // posts was deleted
          expect(eventPosts).toHaveBeenCalledTimes(1) // All up change disappeared
          expect(eventPosts).toHaveBeenCalledWith(undefined)
          expect(eventNew).toHaveBeenCalledTimes(1) // All up change disappeared
          expect(eventNew).toHaveBeenCalledWith(undefined)
          expect(eventAt0).toHaveBeenCalledTimes(1) // All up change disappeared
          expect(eventAt0).toHaveBeenCalledWith(undefined)
          expect(eventId).toHaveBeenCalledTimes(1) // All up change disappeared
          expect(eventId).toHaveBeenCalledWith(undefined)
        })

        it('throws if trying to delete root', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            const dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.remove('')
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Invalid path to value'))
        })
      })

      describe('.concat', (): void => {
        it('concatenate arrays in the tree', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventPosts = jest.fn()
          const eventNew = jest.fn()
          const eventAt0 = jest.fn()
          const eventId = jest.fn()
          const eventOld = jest.fn()
          const eventMore = jest.fn()
          const eventDeep = jest.fn()

          state.on('*', eventAll)
          state.on('posts', eventPosts)
          state.on('posts/new', eventNew)
          state.on('posts/new/0', eventAt0)
          state.on('posts/new/0/id', eventId)
          state.on('posts/old', eventOld)
          state.on('posts/more', eventMore)
          state.on('posts/more/deep', eventDeep)

          let dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.concat('/posts/new/', [{ id: 100 }])
          })
          await dispatcher.await()
          expect(state.get('posts/new')).toEqual([{ id: 1 }, { id: 2 }, { id: 100 }])

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) //Potentially interested
          expect(eventNew).toHaveBeenCalledTimes(1) // new contents changed
          expect(eventAt0).toHaveBeenCalledTimes(1) // it appeared
          expect(eventAt0).toHaveBeenCalledWith({ id: 1 }) // it appeared
          expect(eventId).toHaveBeenCalledTimes(1) // it appeared
          expect(eventId).toHaveBeenCalledWith(1)
          expect(eventOld).toHaveBeenCalledTimes(0)

          eventAll.mockClear()
          eventPosts.mockClear()
          eventNew.mockClear()
          eventAt0.mockClear()
          eventId.mockClear()
          eventOld.mockClear()
          eventMore.mockClear()
          eventDeep.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.concat('/posts/old', [{ id: 200 }])
          })
          await dispatcher.await()
          expect(state.get('posts/old')).toEqual([{ id: 200 }])

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
          expect(eventNew).toHaveBeenCalledTimes(0) // Nothing changed for it
          expect(eventOld).toHaveBeenCalledTimes(1) // content was created
          expect(eventOld).toHaveBeenCalledWith([{ id: 200 }])

          eventAll.mockClear()
          eventPosts.mockClear()
          eventNew.mockClear()
          eventAt0.mockClear()
          eventId.mockClear()
          eventOld.mockClear()
          eventMore.mockClear()
          eventDeep.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.concat('/posts/more/deep', [{ id: 200 }])
          })
          await dispatcher.await()
          expect(state.get('posts/old')).toEqual([{ id: 200 }])

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // Something changed in it
          expect(eventNew).toHaveBeenCalledTimes(0) // nothing changed
          expect(eventOld).toHaveBeenCalledTimes(0) // nothing changed
          expect(eventMore).toHaveBeenCalledTimes(1) // was created
          expect(eventMore).toHaveBeenCalledWith({ deep: [{ id: 200 }] })
          expect(eventDeep).toHaveBeenCalledTimes(1) // content was created
          expect(eventDeep).toHaveBeenCalledWith([{ id: 200 }])
        })

        it('throws if trying to concat into the root state', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            const dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.concat('', [{ id: 100 }])
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Invalid path to value'))
        })

        it('throws if trying to concat into a value that is not an array', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            const dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.concat('posts', [{ id: 100 }])
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Target is not an array'))
        })
      })

      describe('.merge', (): void => {
        it('merges objects in the tree', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventPosts = jest.fn()
          const eventOld = jest.fn()
          const eventExtra = jest.fn()
          const eventExtraYes = jest.fn()

          state.on('*', eventAll)
          state.on('posts', eventPosts)
          state.on('posts/old', eventOld)
          state.on('posts/extra', eventExtra)
          state.on('posts/extra/yes', eventExtraYes)

          let dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.merge('/posts/', { old: [{ id: 100 }] })
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }] })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // posts contents changed
          expect(eventOld).toHaveBeenCalledTimes(1) // was added in the merge
          expect(eventOld).toHaveBeenCalledWith([{ id: 100 }])
          expect(eventExtra).toHaveBeenCalledTimes(0)
          expect(eventExtraYes).toHaveBeenCalledTimes(0)

          eventAll.mockClear()
          eventPosts.mockClear()
          eventOld.mockClear()
          eventExtra.mockClear()
          eventExtraYes.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.merge('/posts/extra', { yes: 'no' })
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }], extra: { yes: 'no' } })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // posts content changed
          expect(eventOld).toHaveBeenCalledTimes(0) // is the same
          expect(eventExtra).toHaveBeenCalledTimes(1) // was created
          expect(eventExtra).toHaveBeenCalledWith({ yes: 'no' })
          expect(eventExtraYes).toHaveBeenCalledTimes(1) // it appeared
          expect(eventExtraYes).toHaveBeenCalledWith('no')

          eventAll.mockClear()
          eventPosts.mockClear()
          eventOld.mockClear()
          eventExtra.mockClear()
          eventExtraYes.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.merge('/posts', { extra: { no: 'yes' } })
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }], extra: { no: 'yes' } })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // posts content changed
          expect(eventOld).toHaveBeenCalledTimes(0) // is the same
          expect(eventExtra).toHaveBeenCalledTimes(1) // was created
          expect(eventExtra).toHaveBeenCalledWith({ no: 'yes' })
          expect(eventExtraYes).toHaveBeenCalledTimes(1) // it disappeared
          expect(eventExtraYes).toHaveBeenCalledWith(undefined)
        })

        it('can merge an object into the main state', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventTags = jest.fn()

          state.on('*', eventAll)
          state.on('tags', eventTags)

          const dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.merge('/', { tags: { new: [{ id: 100 }] } })
          })
          await dispatcher.await()

          expect(state.state).toEqual({ posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] }, tags: { new: [{ id: 100 }] } })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventTags).toHaveBeenCalledTimes(1) // was created
        })

        it('sets the node if it does not exists yet', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventPosts = jest.fn()
          const eventMeta = jest.fn()
          const eventTags = jest.fn()

          state.on('*', eventAll)
          state.on('posts', eventPosts)
          state.on('posts/meta', eventMeta)
          state.on('posts/meta/tags', eventTags)

          const dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.merge('/posts/meta', { tags: { new: [{ id: 100 }] } })
          })
          await dispatcher.await()

          expect(state.state).toEqual({ posts: { new: [{ id: 1 }, { id: 2 }], meta: { tags: { new: [{ id: 100 }] } } }, users: { old: [{ id: 3 }, { id: 4 }] } })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // meta was added to it
          expect(eventMeta).toHaveBeenCalledTimes(1) // was created
          expect(eventTags).toHaveBeenCalledTimes(1) // was created
        })

        it('throws if trying to merge into a value that is not an object', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            const dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.merge('posts/new/0/id', [{ id: 100 }])
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Invalid path to value or target is not an object that can bve merged'))
        })
      })

      describe('.update', (): void => {
        it('updates a node in the state through the provided callback', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)
          const eventAll = jest.fn()
          const eventPosts = jest.fn()
          const eventNew = jest.fn()
          const eventFirst = jest.fn()

          state.on('*', eventAll)
          state.on('posts', eventPosts)
          state.on('posts/new', eventNew)
          state.on('posts/new/0', eventFirst)

          let dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.update('/posts/new/0', (first: any): any => {
              first.name = 'yes'

              return first
            })
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }] })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
          expect(eventNew).toHaveBeenCalledTimes(1) // First element of this collection changed so it technically is different now
          expect(eventNew).toHaveBeenCalledWith([{ id: 1, name: 'yes' }, { id: 2 }])
          expect(eventFirst).toHaveBeenCalledTimes(1) // First element was updated
          expect(eventFirst).toHaveBeenCalledWith({ id: 1, name: 'yes' })

          eventAll.mockClear()
          eventPosts.mockClear()
          eventNew.mockClear()
          eventFirst.mockClear()

          dispatcher = state.mutate((toolSet: ToolSet): void => {
            toolSet.update('/posts', (posts: any): any => {
              posts.updated = 'yes'

              return posts
            })
          })
          await dispatcher.await()
          expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }], updated: 'yes' })

          expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
          expect(eventPosts).toHaveBeenCalledTimes(1) // Posts was updated
          expect(eventNew).toHaveBeenCalledTimes(1) // Potentially changed
          expect(eventNew).toHaveBeenCalledWith([{ id: 1, name: 'yes' }, { id: 2 }])
          expect(eventFirst).toHaveBeenCalledTimes(1) // Potentially changed
          expect(eventFirst).toHaveBeenCalledWith({ id: 1, name: 'yes' })
        })

        it('throws if trying to update the main state', async (): Promise<void> => {
          const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
          const state = new State(initialState)

          let error: Error
          try {
            const dispatcher = state.mutate((toolSet: ToolSet): void => {
              toolSet.update('/', (posts: any): any => {
                posts['yes'] = 'no'

                return posts
              })
            })
            await dispatcher.await()
          } catch (err) {
            error = err
          }
          expect(error).toEqual(new Error('Invalid path to value'))
        })
      })
    })
  })
})
