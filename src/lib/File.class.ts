import { type WriteStream, createWriteStream, existsSync, statSync } from 'fs'
import { isFile, isFilePathString } from '../utils/guards.js'

export default class File {
  public static $id = 'File'
  private readonly $isValid?: boolean
  public constructor(private $path: string) {}

  public validate(): File {
    if (this.$isValid !== undefined) return this
    if (!isFilePathString(this.$path)) {
      const wrongFilePath: string = this.$path as any as string
      throw new Error(`The filename \`${wrongFilePath}\` should start with \`file://\``)
    }
    this.$path = this.$path.replace(/^file:\/\//, '')
    if (!existsSync(this.$path) || !statSync(this.$path).isFile()) {
      throw new Error(`File not found: \`${this.$path}\``)
    }
    return this
  }

  public get path(): string {
    return this.$path
  }

  public getStream(): WriteStream {
    if (existsSync(this.$path)) {
      // throw new Error(`File already exists: \`${this.$path}\``)
    }
    return createWriteStream(this.$path)
  }

  public toString(): string {
    this.validate()
    return this.$path
  }

  public static is(value: any): value is File {
    return isFile(value)
  }
}