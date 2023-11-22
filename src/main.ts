import fs from 'fs'

export default function version(): string {
  const { version } = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
  return version
}

console.info(`Welcome to LD Workbench version ${version()}`)
