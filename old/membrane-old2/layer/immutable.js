
/*
class ImmutableIO extends IO {
  _input (x) {
    _deepReplace(x, x => {
      return ImmutableIO._getTarget(ImmutableLayer._getTarget(x))
    })
  }

  _output (x) {
    return new ImmutableLayer(new ImmutableIO(x))
  }
}
*/
