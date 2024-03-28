import { State, ToolSet } from '../../../src'

describe(State, (): void => {
  describe('.mutate', (): void => {
    describe('.merge', (): void => {
      it('merges objects in the tree', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)
        const eventAll = jest.fn()
        const eventPosts = jest.fn()
        const eventOld = jest.fn()
        const eventExtra = jest.fn()
        const eventExtraYes = jest.fn()

        state.on('@', eventAll)
        state.on('posts', eventPosts)
        state.on('posts/old', eventOld)
        state.on('posts/extra', eventExtra)
        state.on('posts/extra/yes', eventExtraYes)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.merge('/posts/', { old: [{ id: 100 }] })
        })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }] })

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // posts contents changed
        expect(eventOld).toHaveBeenCalledTimes(1) // was added in the merge
        expect(eventOld).toHaveBeenCalledWith({ event: 'posts/old', payload: [{ id: 100 }] })
        expect(eventExtra).toHaveBeenCalledTimes(0)
        expect(eventExtraYes).toHaveBeenCalledTimes(0)

        eventAll.mockClear()
        eventPosts.mockClear()
        eventOld.mockClear()
        eventExtra.mockClear()
        eventExtraYes.mockClear()

        state.mutate((toolSet: ToolSet): void => {
          toolSet.merge('/posts/extra', { yes: 'no' })
        })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }], extra: { yes: 'no' } })

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // posts content changed
        expect(eventOld).toHaveBeenCalledTimes(0) // is the same
        expect(eventExtra).toHaveBeenCalledTimes(1) // was created
        expect(eventExtra).toHaveBeenCalledWith({ event: 'posts/extra', payload: { yes: 'no' } })
        expect(eventExtraYes).toHaveBeenCalledTimes(1) // it appeared
        expect(eventExtraYes).toHaveBeenCalledWith({ event: 'posts/extra/yes', payload: 'no' })

        eventAll.mockClear()
        eventPosts.mockClear()
        eventOld.mockClear()
        eventExtra.mockClear()
        eventExtraYes.mockClear()

        state.mutate((toolSet: ToolSet): void => {
          toolSet.merge('/posts', { extra: { no: 'yes' } })
        })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }], extra: { no: 'yes' } })

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // posts content changed
        expect(eventOld).toHaveBeenCalledTimes(0) // is the same
        expect(eventExtra).toHaveBeenCalledTimes(1) // was created
        expect(eventExtra).toHaveBeenCalledWith({ event: 'posts/extra', payload: { no: 'yes' } })
        expect(eventExtraYes).toHaveBeenCalledTimes(1) // it disappeared
        expect(eventExtraYes).toHaveBeenCalledWith({ event: 'posts/extra/yes', payload: undefined })
      })

      it('can merge an object into the main state', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)
        const eventAll = jest.fn()
        const eventTags = jest.fn()

        state.on('@', eventAll)
        state.on('tags', eventTags)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.merge('/', { tags: { new: [{ id: 100 }] } })
        })

        await state.waitForMutations()

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

        state.on('@', eventAll)
        state.on('posts', eventPosts)
        state.on('posts/meta', eventMeta)
        state.on('posts/meta/tags', eventTags)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.merge('/posts/meta', { tags: { new: [{ id: 100 }] } })
        })

        await state.waitForMutations()

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

        state.on('error', (event) => {
          error = event.error
        })

        state.mutate((toolSet: ToolSet): void => {
          toolSet.merge('posts/new/0/id', [{ id: 100 }])
        })

        await state.waitForMutations()

        expect(error).toEqual(new Error('Invalid path to value or target is not an object that can be merged'))
      })
    })
  })
})
