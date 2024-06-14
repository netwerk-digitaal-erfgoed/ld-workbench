import {Configuration} from '../configuration.js';
import validate from './validate.js';
import TriplyDB from '../triply-db.js';
import File from '../file.js';
import {PreviousStage} from '../stage.js';

export const isConfiguration = (value: unknown): value is Configuration =>
  value !== null && typeof value === 'object' && validate(value) === null;

type FilePathString = string;
export const isFilePathString = (value?: string): value is FilePathString => {
  return value !== undefined && value.startsWith('file://');
};

type TriplyDBPathString = string;
export const isTriplyDBPathString = (
  value: unknown
): value is TriplyDBPathString => {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('triplydb://')) return false;
  TriplyDB.assertValidDsn(value);
  return true;
};

export const isPreviousStage = (value: unknown): value is PreviousStage =>
  value instanceof PreviousStage;

export const isFile = (value: unknown): value is File => value instanceof File;
