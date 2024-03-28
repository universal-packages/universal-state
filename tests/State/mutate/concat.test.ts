import { State, ToolSet } from '../../../src'

describe(State, (): void => {
  describe('.mutate', (): void => {
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

        state.on('@', eventAll)
        state.on('posts', eventPosts)
        state.on('posts/new', eventNew)
        state.on('posts/new/0', eventAt0)
        state.on('posts/new/0/id', eventId)
        state.on('posts/old', eventOld)
        state.on('posts/more', eventMore)
        state.on('posts/more/deep', eventDeep)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.concat('/posts/new/', [{ id: 100 }])
        })

        await state.waitForMutations()

        expect(state.get('posts/new')).toEqual([{ id: 1 }, { id: 2 }, { id: 100 }])

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) //Potentially interested
        expect(eventNew).toHaveBeenCalledTimes(1) // new contents changed
        expect(eventAt0).toHaveBeenCalledTimes(1) // it appeared
        expect(eventAt0).toHaveBeenCalledWith({ event: 'posts/new/0', payload: { id: 1 } })
        expect(eventId).toHaveBeenCalledTimes(1) // it appeared
        expect(eventId).toHaveBeenCalledWith({ event: 'posts/new/0/id', payload: 1 })
        expect(eventOld).toHaveBeenCalledTimes(0)

        eventAll.mockClear()
        eventPosts.mockClear()
        eventNew.mockClear()
        eventAt0.mockClear()
        eventId.mockClear()
        eventOld.mockClear()
        eventMore.mockClear()
        eventDeep.mockClear()

        state.mutate((toolSet: ToolSet): void => {
          toolSet.concat('/posts/old', [{ id: 200 }])
        })

        await state.waitForMutations()

        expect(state.get('posts/old')).toEqual([{ id: 200 }])

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
        expect(eventNew).toHaveBeenCalledTimes(0) // Nothing changed for it
        expect(eventOld).toHaveBeenCalledTimes(1) // content was created
        expect(eventOld).toHaveBeenCalledWith({ event: 'posts/old', payload: [{ id: 200 }] })

        eventAll.mockClear()
        eventPosts.mockClear()
        eventNew.mockClear()
        eventAt0.mockClear()
        eventId.mockClear()
        eventOld.mockClear()
        eventMore.mockClear()
        eventDeep.mockClear()

        state.mutate((toolSet: ToolSet): void => {
          toolSet.concat('/posts/more/deep', [{ id: 200 }])
        })

        await state.waitForMutations()

        expect(state.get('posts/old')).toEqual([{ id: 200 }])

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // Something changed in it
        expect(eventNew).toHaveBeenCalledTimes(0) // nothing changed
        expect(eventOld).toHaveBeenCalledTimes(0) // nothing changed
        expect(eventMore).toHaveBeenCalledTimes(1) // was created
        expect(eventMore).toHaveBeenCalledWith({ event: 'posts/more', payload: { deep: [{ id: 200 }] } })
        expect(eventDeep).toHaveBeenCalledTimes(1) // content was created
        expect(eventDeep).toHaveBeenCalledWith({ event: 'posts/more/deep', payload: [{ id: 200 }] })
      })

      it('throws if trying to concat into the root state', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        let error: Error

        state.on('error', (event) => {
          error = event.error
        })

        state.mutate((toolSet: ToolSet): void => {
          toolSet.concat('', [{ id: 100 }])
        })

        await state.waitForMutations()

        expect(error).toEqual(new Error('Invalid path to value'))
      })

      it('throws if trying to concat into a value that is not an array', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        let error: Error

        state.on('error', (event) => {
          error = event.error
        })

        state.mutate((toolSet: ToolSet): void => {
          toolSet.concat('posts', [{ id: 100 }])
        })

        await state.waitForMutations()

        expect(error).toEqual(new Error('Target is not an array'))
      })
    })
  })
})
