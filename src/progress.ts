import ora, {Ora} from 'ora';

export class Progress {
  public readonly startTime = performance.now();
  private readonly spinner?: Ora;

  constructor(private options: {silent: boolean}) {
    if (!options.silent) {
      this.spinner = ora();
    }
    return this;
  }

  start(text: string) {
    this.spinner?.start(text);
    return this;
  }

  line(text: string) {
    if (!this.options.silent) {
      console.info(text);
    }
    return this;
  }

  text(text: string) {
    if (this.spinner) this.spinner.text = text;
  }

  fail(message: string) {
    this.spinner?.fail(message);
  }

  suffixText(text: string) {
    if (this.spinner === undefined) return;
    this.spinner.suffixText = text;
  }

  succeed(text?: string) {
    this.spinner?.succeed(text);
  }

  stop() {
    this.spinner?.stop();
  }
}
