import { State } from '../../src'

describe(State, (): void => {
  describe('.merge', (): void => {
    it('merges objects in the tree', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)

      state.merge('/posts/', { old: [{ id: 100 }] })

      await state.await

      expect(state.get('posts')).toEqual({ new: [{ id: 1 }, { id: 2 }], old: [{ id: 100 }] })
    })
  })
})
