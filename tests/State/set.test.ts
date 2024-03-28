import { State } from '../../src'

describe(State, (): void => {
  describe('single actions', (): void => {
    describe('.set', (): void => {
      it('sets new values in deep paths', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        state.set('/posts/old/', [{ id: 100 }])

        await state.waitForMutations()

        expect(state.get('posts/old')).toEqual([{ id: 100 }])
      })
    })

    describe('.delete', (): void => {
      it('deletes a value in a deep path', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        state.remove('/posts/new/0/id')

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{}, { id: 2 }] })
      })
    })

    describe('.concat', (): void => {
      it('concatenate arrays in the tree', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        state.concat('/posts/new/', [{ id: 100 }])

        await state.waitForMutations()

        expect(state.get('posts/new')).toEqual([{ id: 1 }, { id: 2 }, { id: 100 }])
      })
    })

    describe('.merge', (): void => {
      it('merges objects in the tree', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        state.merge('/posts/', { old: [{ id: 100 }] })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }] })
      })
    })

    describe('.update', (): void => {
      it('updates a node in the state through the provided callback', async (): Promise<void> => {
        const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
        const state = new State(initialState)

        state.update('/posts/new/0', (first: any): any => {
          first.name = 'yes'

          return first
        })

        await state.waitForMutations()

        expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }] })
      })
    })
  })
})
