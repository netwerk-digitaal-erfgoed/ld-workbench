import chalk from 'chalk';

export const error = (
  message: string | Error,
  exitCode?: number,
  ...info: Array<string | Error>
): void => {
  console.error(
    chalk.red(message instanceof Error ? message.message : message)
  );
  if (info.length > 0) {
    for (const i of info) {
      console.info(i instanceof Error ? i.message : i);
    }
  }
  throw message;
};
