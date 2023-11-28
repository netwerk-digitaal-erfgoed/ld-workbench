import type { LDWorkbenchConfiguration } from '../lib/LDWorkbenchConfiguration.js';
import type PreviousStage from '../lib/PreviousStage.class.js';
import type File from '../lib/File.class.js';
import validate from './validate.js';

export const isConfiguration = (value: any): value is LDWorkbenchConfiguration => 
 typeof value === 'object' && validate(value) === null


type FilePathString = string
export const isFilePathString = (value: any): value is FilePathString => {
  if (typeof value !== 'string') return false
  if (!value.startsWith('file://')) return false
  return true
}

export const isPreviousStage = (value: any): value is PreviousStage => 
 typeof value === 'object' && Object.hasOwn(value, '$id') && value.$id === 'PreviousStage'

export const isFile = (value: any): value is File => 
 typeof value === 'object' && Object.hasOwn(value, '$id') && value.$id === 'File'
