import { State } from '../../src'

describe(State, (): void => {
  describe('.get', (): void => {
    it('returns the value in the given path of the state', async (): Promise<void> => {
      const posts = { new: [{ id: 1 }, { id: 2 }] }
      const users = { old: [{ id: 3 }, { id: 4 }] }
      const initialState = { posts, users }
      const state = new State(initialState)

      expect(state.get()).toEqual(initialState)
      expect(state.get('')).toEqual(initialState)
      expect(state.get('/')).toEqual(initialState)
      expect(state.get('/posts')).toEqual(posts)
      expect(state.get('/posts/new')).toEqual(posts.new)
      expect(state.get('/posts//new/0')).toEqual(posts.new[0])
      expect(state.get('/posts//new/1')).toEqual(posts.new[1])
      expect(state.get('/posts//new/0/id')).toEqual(posts.new[0].id)
      expect(state.get('/posts//new/1/id')).toEqual(posts.new[1].id)

      expect(state.get('/users')).toEqual(users)
      expect(state.get('/users/old')).toEqual(users.old)
      expect(state.get('/users//old/0')).toEqual(users.old[0])
      expect(state.get('/users//old/1')).toEqual(users.old[1])
      expect(state.get('/users//old/0/id')).toEqual(users.old[0].id)
      expect(state.get('/users//old/1/id')).toEqual(users.old[1].id)

      expect(state.get('/not/a/path/to/something')).toEqual(undefined)
    })
  })
})
