# State

[![npm version](https://badge.fury.io/js/@universal-packages%2Fstate.svg)](https://www.npmjs.com/package/@universal-packages/state)
[![Testing](https://github.com/universal-packages/universal-state/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-state/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-state/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-state)

There are a lot of ways to track your app state nowadays, all reliable and easy to grasp, but sometimes they can feel a little convoluted as your application grows and you start to keep track of a lot of resolvers, transformers, actions, descriptors, selectors and so on. Universal state offers an alternative by just mutating and getting your state by using string paths.

## Install

```shell
npm install @universal-packages/state
```

## State

State class is the high level representation of the state object, it provides all tools related to modify and read from state.

```js
import { State } from '@universal-packages/state'

async function test() {
  const initialState = { loading: true }
  const state = new State(initialState)

  await tate.set('loading', false).await()

  console.log(state.get())
}

test()

// > { loading: false }
```

### Instance methods

#### **`.clear()`**

Clears the state object and emits such big change to all listeners

#### **`.get(path: String)`**

Get any value using a deep path.

```js
const state = new State(initialState)

const value = state.get('and/am/mean/it/0/it/does/not/matter/how/deep')
```

#### **`.mutate(mutator: Function)`**

Mutate enables you to apply all kinds of mutations to the state without worrying about race conditions with other mutations being applied, it takes a mutator function and calls it only when it’s its turn to be dispatched (All mutations are dispatched in a linear way). It returns a [BufferDispatcher](https://github.com/universal-packages/universal-buffer-dispatcher) object in charge of dispatching all mutations.

```js
import { State } from '@universal-packages/state'

async function test() {
  const initialState = { loading: true, auth: { user: {}, empty: true } }
  const state = new State(initialState)
  const user = await getUser()

  const dispatcher = state.mutate((toolSet) => {
    toolSet.set('loading', false)
    toolSet.merge('auth/user', user)
    toolSet.remove('auth/empty')
  })

  await despatcher.await()

  console.log(state.get())
}

test()

// > { loading: false, auth: { user: { id: 1, name: 'david' } } }
```

## ToolSet

Provides the methods to actually change the state, use only these to mutate teh state.

```js
state.mutate((toolSet) => {
  // All the mutations
})
```

### Instance methods

#### **`.concat(path: String, array: Array)`**

Directly append an array into one inside the state

```js
const initialState = { users: { ordered: [{ id: 1 }] } }

toolSet.concat('users/ordered', [{ id: 2 }, { id: 3 }])
```

#### **`.merge(path: String, subject: Object)`**

Merge an object into any place into the state

```js
const initialState = { users: { ordered: [{ id: 1 }] } }

toolSet.merge('users/ordered/0', { name: 'david' })
```

#### **`.remove(path: String)`**

Completely obliterates any part of the state

```js
const initialState = { users: { ordered: [{ id: 1 }] } }

toolSet.remove('users/ordered')
```

#### **`.set(path: String, subject: any)`**

Sets a single value into any part of the state

```js
const initialState = { users: { ordered: [{ id: 1 }] } }

toolSet.set('users/ordered/0/name', 'david')
```

#### **`.update(path: String, updater: Function)`**

Updates a value in the state using a function providing the current value as a parameter

```js
const initialState = { users: { ordered: [{ id: 1 }] } }

toolSet.update('users/ordered/0', (david) => {
  return { id: david.id, name: 'omar' }
})
```

## Listening for changes

The state object behaves just like a event emitter, you can subscribe to changes in the state for a specific path.

```js
const initialState = { posts: { new: [{ id: 1 }, { id: 2 }] } }
const state = new State(initialState)

state.on('*', (state) => console.log('State changed'))
state.on('posts', (posts) => console.log('Post changed'))
state.on('posts/old', (old) => console.log('Old was created'))
state.on('posts/old/0', (at0) => console.log('Old at 0 is part of the value set'))
state.on('posts/old/0/id', (id) => console.log('Old at 0/id is part of the value set'))
state.on('posts/new', (new) => console.log('Post new did not changed'))
state.on('posts/new/0', (at0) => console.log('New at 0 changed'))

let dispatcher = state.mutate((toolSet: ToolSet): void => {
  toolSet.set('/posts/old/', [{ id: 100 }])
  toolSet.merge('/posts/new/0', { name: 'david' })
})
await dispatcher.await()

// > State changed
// > Post changed
// > Old was created
// > New at 0 changed
```

## Stand alone mutations

You can directly push a mutation without the need of building a mutator function by just calling the methods directly on the state object.

```js
const state = new State(initialState)

state.set('loading', false)
state.merge('auth/user', user)
state.remove('auth/empty')
```

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
