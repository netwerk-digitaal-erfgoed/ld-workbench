export const error = (message: string | Error): void => {
  if (message instanceof Error) {
    console.error(`\n${message.message}`);
    if (message.cause) {
      console.error('\nCaused by:\n', message.cause);
    }
  } else {
    console.error(`\n${message}`);
  }
};
