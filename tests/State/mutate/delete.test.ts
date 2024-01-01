import { State, ToolSet } from '../../../src'

describe(State, (): void => {
  describe('.mutate', (): void => {
    describe('.delete', (): void => {
      it('deletes a value in a deep path', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)
        const eventAll = jest.fn()
        const eventPosts = jest.fn()
        const eventNew = jest.fn()
        const eventAt0 = jest.fn()
        const eventId = jest.fn()

        state.on('@', eventAll)
        state.on('posts', eventPosts)
        state.on('posts/new', eventNew)
        state.on('posts/new/0', eventAt0)
        state.on('posts/new/0/id', eventId)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.remove('/posts/new/0/id')
        })

        await state.await

        expect(state.get('posts')).toEqual({ new: [{}, { id: 2 }] })
        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
        expect(eventNew).toHaveBeenCalledTimes(1) // Potentially interested
        expect(eventAt0).toHaveBeenCalledTimes(1) // 0 contents changes so it was emitted
        expect(eventAt0).toHaveBeenCalledWith({ event: 'posts/new/0', payload: {} })
        expect(eventId).toHaveBeenCalledTimes(1) // id was deleted so it technically changed
        expect(eventId).toHaveBeenCalledWith({ event: 'posts/new/0/id', payload: undefined })

        eventAll.mockClear()
        eventPosts.mockClear()
        eventNew.mockClear()
        eventAt0.mockClear()
        eventId.mockClear()

        state.mutate((toolSet: ToolSet): void => {
          toolSet.remove('/posts/old/0/id')
        })

        await state.await

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

        state.mutate((toolSet: ToolSet): void => {
          toolSet.remove('/posts')
        })

        await state.await

        expect(state.get('posts')).toEqual(undefined)
        expect(eventAll).toHaveBeenCalledTimes(1) // posts was deleted
        expect(eventPosts).toHaveBeenCalledTimes(1) // All up change disappeared
        expect(eventPosts).toHaveBeenCalledWith({ event: 'posts', payload: undefined })
        expect(eventNew).toHaveBeenCalledTimes(1) // All up change disappeared
        expect(eventNew).toHaveBeenCalledWith({ event: 'posts/new', payload: undefined })
        expect(eventAt0).toHaveBeenCalledTimes(1) // All up change disappeared
        expect(eventAt0).toHaveBeenCalledWith({ event: 'posts/new/0', payload: undefined })
        expect(eventId).toHaveBeenCalledTimes(1) // All up change disappeared
        expect(eventId).toHaveBeenCalledWith({ event: 'posts/new/0/id', payload: undefined })
      })

      it('throws if trying to delete root', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        let error: Error
        try {
          state.mutate((toolSet: ToolSet): void => {
            toolSet.remove('')
          })

          await state.await
        } catch (err) {
          error = err
        }
        expect(error).toEqual(new Error('Invalid path to value'))
      })
    })
  })
})
