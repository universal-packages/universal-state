import { State } from '../../src'

describe(State, (): void => {
  describe('.update', (): void => {
    it('updates a node in the state through the provided callback', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)

      state.update('/posts/new/0', (first: any): any => {
        first.name = 'yes'

        return first
      })

      await state.await

      expect(state.get('posts')).toEqual({ new: [{ id: 1, name: 'yes' }, { id: 2 }] })
    })
  })
})
