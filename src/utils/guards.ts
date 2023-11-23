import type { LDWorkbenchConfiguration } from '../lib/LDWorkbenchConfiguration.js';
import validate from './validate.js';

export const isConfiguration = (value: any): value is LDWorkbenchConfiguration => 
 typeof value === 'object' && validate(value) === null


type FilePathString = string
export const isFilePathString = (value: any): value is FilePathString => {
  if (typeof value !== 'string') return false
  if (!value.startsWith('file://')) return false
  return true
}