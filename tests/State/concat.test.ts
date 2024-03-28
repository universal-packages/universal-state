import { State } from '../../src'

describe(State, (): void => {
  describe('.concat', (): void => {
    it('concatenate arrays in the tree', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)

      state.concat('/posts/new/', [{ id: 100 }])

      await state.waitForMutations()

      expect(state.get('posts/new')).toEqual([{ id: 1 }, { id: 2 }, { id: 100 }])
    })
  })
})
