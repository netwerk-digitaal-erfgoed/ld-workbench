import { expect } from "chai"
import version from '../main.js'

describe('Main tests', () => {
  it('should correctly get a version number', () => {
    expect(version()).match(/^\d+\.\d+\.\d+(?:-rc.+)?$/)
  })
})
