import { State, ToolSet } from '../../../src'

describe(State, (): void => {
  describe('.mutate', (): void => {
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

        state.on('@', eventAll)
        state.on('posts', eventPosts)
        state.on('posts/old', eventOld)
        state.on('posts/old/0', eventAt0)
        state.on('posts/old/0/id', eventId)
        state.on('posts/more', eventMore)
        state.on('posts/more/deep', eventDeep)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.set('/posts/old/', [{ id: 100 }])
        })

        await state.await

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

        state.mutate((toolSet: ToolSet): void => {
          toolSet.set('/posts/old/0/id', 200)
        })

        await state.await

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

        state.mutate((toolSet: ToolSet): void => {
          toolSet.set('/posts/more/deep/id', 200)
        })

        await state.await

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
          state.mutate((toolSet: ToolSet): void => {
            toolSet.set('/posts/new/0/id/1/more/deep', 200)
          })

          await state.await
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
          state.mutate((toolSet: ToolSet): void => {
            toolSet.set('', [{ id: 100 }])
          })

          await state.await
        } catch (err) {
          error = err
        }
        expect(error).toEqual(new Error('Root state should not be directly set'))
      })
    })
  })
})
