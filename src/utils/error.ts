import chalk from 'chalk';

export const error = (
  message: string | Error,
  ...info: Array<string | Error>
): void => {
  console.error(
    chalk.red(message instanceof Error ? message.message : message)
  );
  info.forEach(i => console.info(i));
};
