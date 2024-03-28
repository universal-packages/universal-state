import { State } from '../../src'

describe(State, (): void => {
  describe('.delete', (): void => {
    it('deletes a value in a deep path', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)

      state.remove('/posts/new/0/id')

      await state.waitForMutations()

      expect(state.get('posts')).toEqual({ new: [{}, { id: 2 }] })
    })
  })
})
