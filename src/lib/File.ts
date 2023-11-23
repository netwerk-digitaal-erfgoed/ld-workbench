import { existsSync, statSync } from 'fs'
import { isFilePathString } from '../utils/guards.js'

export default class File {
  private readonly $isValid?: boolean
  public constructor(private $path: string) {}

  public validate(): void {
    if (this.$isValid !== undefined) return
    if (!isFilePathString(this.$path)) {
      const wrongFilePath: string = this.$path as any as string
      throw new Error(`The filename \`${wrongFilePath}\` should start with \`file://\``)
    }
    this.$path = this.$path.replace(/^file:\/\//, '')
    if (!existsSync(this.$path) || !statSync(this.$path).isFile()) {
      throw new Error(`File not found: \`${this.$path}\``)
    }
  }

  public toString(): string {
    this.validate()
    return this.$path
  }
}