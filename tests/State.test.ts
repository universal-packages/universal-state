import { State } from '../src'

describe(State, (): void => {
  it('it can have an initial state', async (): Promise<void> => {
    const state = new State({ initial: 'value' })

    expect(state.get()).toEqual({ initial: 'value' })
    expect(state.get('initial')).toEqual('value')
  })

  it('it can have a default empty state', async (): Promise<void> => {
    const state = new State()

    expect(state.get()).toEqual({})
  })
})
