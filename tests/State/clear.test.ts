import { State } from '../../src'

describe(State, (): void => {
  describe('.clear', (): void => {
    it('clears the state', async (): Promise<void> => {
      const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] }, users: { old: [{ id: 3 }, { id: 4 }] } }
      const state = new State(initialState)
      const eventAll = jest.fn()
      const eventPosts = jest.fn()
      const eventUsers1 = jest.fn()

      state.on('@', eventAll)
      state.on('posts', eventPosts)
      state.on('users/old/0', eventUsers1)
      state.clear()

      expect(state.get()).toEqual({})
      expect(eventAll).toHaveBeenCalledTimes(1)
      expect(eventPosts).toHaveBeenCalledTimes(1)
      expect(eventUsers1).toHaveBeenCalledTimes(1)
      expect(eventAll).toHaveBeenCalledWith({ event: '@', payload: {} })
      expect(eventPosts).toHaveBeenCalledWith({ event: 'posts', payload: undefined })
      expect(eventUsers1).toHaveBeenCalledWith({ event: 'users/old/0', payload: undefined })
    })
  })
})
