import { State, ToolSet } from '../../../src'

describe(State, (): void => {
  describe('.mutate', (): void => {
    describe('.update', (): void => {
      it('updates a node in the state through the provided callback', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)
        const eventAll = jest.fn()
        const eventPosts = jest.fn()
        const eventNew = jest.fn()
        const eventFirst = jest.fn()

        state.on('@', eventAll)
        state.on('posts', eventPosts)
        state.on('posts/new', eventNew)
        state.on('posts/new/0', eventFirst)

        state.mutate((toolSet: ToolSet): void => {
          toolSet.update('/posts/new/0', (first: any): any => {
            first.name = 'yes'

            return first
          })
        })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }] })

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // Potentially interested
        expect(eventNew).toHaveBeenCalledTimes(1) // First element of this collection changed so it technically is different now
        expect(eventNew).toHaveBeenCalledWith({ event: 'posts/new', payload: [{ id: 1, name: 'yes' }, { id: 2 }] })
        expect(eventFirst).toHaveBeenCalledTimes(1) // First element was updated
        expect(eventFirst).toHaveBeenCalledWith({ event: 'posts/new/0', payload: { id: 1, name: 'yes' } })

        eventAll.mockClear()
        eventPosts.mockClear()
        eventNew.mockClear()
        eventFirst.mockClear()

        state.mutate((toolSet: ToolSet): void => {
          toolSet.update('/posts', (posts: any): any => {
            posts.updated = 'yes'

            return posts
          })
        })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }], updated: 'yes' })

        expect(eventAll).toHaveBeenCalledTimes(1) // Something changed across the state
        expect(eventPosts).toHaveBeenCalledTimes(1) // Posts was updated
        expect(eventNew).toHaveBeenCalledTimes(1) // Potentially changed
        expect(eventNew).toHaveBeenCalledWith({ event: 'posts/new', payload: [{ id: 1, name: 'yes' }, { id: 2 }] })
        expect(eventFirst).toHaveBeenCalledTimes(1) // Potentially changed
        expect(eventFirst).toHaveBeenCalledWith({ event: 'posts/new/0', payload: { id: 1, name: 'yes' } })
      })

      it('throws if trying to update the main state', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        let error: Error

        state.on('error', (event) => {
          error = event.error
        })

        state.mutate((toolSet: ToolSet): void => {
          toolSet.update('/', (posts: any): any => {
            posts['yes'] = 'no'

            return posts
          })
        })

        await state.waitForMutations()

        expect(error).toEqual(new Error('Invalid path to value'))
      })
    })
  })
})
