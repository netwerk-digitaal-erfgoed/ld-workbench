import { type WriteStream, createWriteStream, existsSync, statSync, mkdirSync } from 'fs'
import { isFile, isFilePathString } from '../utils/guards.js'
import { dirname } from 'path'

export default class File {
  public static $id = 'File'
  private $isValid?: boolean
  public constructor(private $path: string, private readonly skipExistsCheck: boolean = false) {}

  public validate(): File {
    if (this.$isValid !== undefined) return this
    if (!isFilePathString(this.$path)) {
      const wrongFilePath: string = this.$path as any as string
      throw new Error(`The filename \`${wrongFilePath}\` should start with \`file://\``)
    }
    this.$path = this.$path.replace(/^file:\/\//, '')
    if (!this.skipExistsCheck && (!existsSync(this.$path) || !statSync(this.$path).isFile())) {
      throw new Error(`File not found: \`${this.$path}\``)
    }
    this.$isValid = true
    return this
  }

  public get path(): string {
    return this.$path
  }

  public getStream(append: boolean = false): WriteStream {
    if (existsSync(this.$path)) {
      // throw new Error(`File already exists: \`${this.$path}\``)
    }
    if (!existsSync(dirname(this.$path))) {
      mkdirSync(dirname(this.$path), { recursive: true})
    }
    return createWriteStream(this.$path, append ? {flags: 'a'} : {})
  }

  public toString(): string {
    this.validate()
    return this.$path
  }

  public static is(value: any): value is File {
    return isFile(value)
  }
}