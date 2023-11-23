import { expect } from "chai"
import version from '../version.js'
import parseYamlFile from '../parseYamlFile.js'
import validate from '../validate.js'
import { isConfiguration } from '../guards.js'
import loadConfiguration from '../loadConfiguration.js'
import duration from '../duration.js'

describe('Utilities', () => {
  it('should correctly get a version number', () => {
    expect(version()).match(/^\d+\.\d+\.\d+(?:-rc.+)?$/)
  })

  it('should correctly get a duration string', () => {
    expect(duration(new Date())).match(/^[0-5]ms$/)
  })

  describe('YAML Parser', () => {
    it('should parse a YAML file', () => {
      expect(() => parseYamlFile('./static/example/config.yml')).to.not.throw()
    })
    it('should parse a JSON file', () => {
      expect(() => parseYamlFile('./static/ld-workbench.schema.json')).to.not.throw()
    })
    it('should throw on non-YAML file', () => {
      expect(() => {parseYamlFile('./README.md')}).to.throw('Error parsing file: `./README.md`, are you sure it is a YAML file?')
    })
    it('should throw on non existing YAML file', () => {
      expect(() => {parseYamlFile('./non-existing-file')}).to.throw('File not found: ./non-existing-file')
    })
    it('should throw on on directories', () => {
      expect(() => {parseYamlFile('./src')}).to.throw('File not found: ./src')
    })
  })

  describe('Validation of YAML files', () => {
    it('should correctly detect a valid YAML configuration', () => {
      expect(validate('./static/example/config.yml')).to.equal(null)
    })
    it('should correctly detect a valid configuration using an object', () => {
      const configuration = parseYamlFile('./static/example/config.yml')
      expect(validate(configuration)).to.equal(null)
    })
    it('should correctly detect an invalid YAML configuration', () => {
      expect(validate('./package.json')).to.not.equal(null)
    })
  })
  describe('Type guards', () => {
    it('should assert a configuration', () => {
      const configuration = parseYamlFile('./static/example/config.yml')
      expect(isConfiguration(configuration)).to.equal(true)
    })
    it('should not assert an invalid configuration', () => {
      const configuration = parseYamlFile('./package.json')
      for (const val of [configuration, '', undefined, null, [], {}]) {
        expect(isConfiguration(val)).to.equal(false)
      }
    })
  })

  it('should load and validate using the wrapper', () => {
    expect(isConfiguration(loadConfiguration('./static/example/config.yml'))).to.equal(true)
    expect(() => isConfiguration(loadConfiguration('./package.json'))).to.throw('he YAML file `./package.json` is not a valid LD Workbench configuration file.')
  })
})
