import type { LDWorkbenchConfiguration } from '../lib/LDWorkbenchConfiguration.js';
import type PreviousStage from '../lib/PreviousStage.class.js';
import type File from '../lib/File.class.js';
import validate from './validate.js';
import TriplyDB from '../lib/TriplyDB.class.js';

export const isConfiguration = (value: any): value is LDWorkbenchConfiguration => 
 typeof value === 'object' && validate(value) === null


type FilePathString = string
export const isFilePathString = (value: any): value is FilePathString => {
  if (typeof value !== 'string') return false
  if (!value.startsWith('file://')) return false
  return true
}

type TriplyDBPathString = string
export const isTriplyDBPathString = (value: any): value is TriplyDBPathString => {
  if (typeof value !== 'string') return false
  if (!value.startsWith('triplydb://')) return false
  TriplyDB.assertValidDsn(value)
  return true
}

export const isPreviousStage = (value: any): value is PreviousStage => 
 typeof value === 'object' && Object.hasOwn(value, '$id') && value.$id === 'PreviousStage'

export const isFile = (value: any): value is File => 
 typeof value === 'object' && Object.hasOwn(value, '$id') && value.$id === 'File'
