import { State } from '../../src'

describe(State, (): void => {
  describe('#getPath', (): void => {
    it('runs a string path or joined if array', async (): Promise<void> => {
      expect(State.resolvePath('/cosas')).toEqual('cosas')
      expect(State.resolvePath('/cosas//////////')).toEqual('cosas')
      expect(State.resolvePath('  /////cosas//////////   ')).toEqual('  /cosas/   ')
      expect(State.resolvePath(['cosas', 'mas cosas'])).toEqual('cosas/mas cosas')
      expect(State.resolvePath('  /////cos/   / addd  /as//////////   ')).toEqual('  /cos/   / addd  /as/   ')
      expect(State.resolvePath('/expected//kind/of/path')).toEqual('expected/kind/of/path')
    })
  })
})
