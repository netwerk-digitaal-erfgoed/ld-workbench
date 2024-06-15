import type Pipeline from './pipeline.js';
import App from '@triply/triplydb';
import {Progress} from './progress.js';

const pattern = /^triplydb:\/\/([a-z0-9-]+)\/([a-z0-9-]+)$/;

export default class TriplyDB {
  public static $id = 'TriplyDB';
  public datasetname: string;
  public accountname: string;
  public app: App | undefined;
  protected $datasetUrl: string | undefined;

  constructor(protected $dsn: string) {
    TriplyDB.assertValidDsn($dsn);
    this.accountname = $dsn.match(pattern)![1];
    this.datasetname = $dsn.match(pattern)![2];
  }

  public static assertValidDsn(value: string): void {
    if (!pattern.test(value))
      throw new Error(
        'A TriplyDB path should look like this: "triplydb://accountname/dataset"'
      );
  }

  public toString(): string {
    return this.$dsn;
  }

  public validate(): TriplyDB {
    if (process.env.TOKEN === undefined) {
      throw new Error(
        'To publish to triply you need an environment variable "TOKEN" with your TriplyDB API Token, see https://docs.triply.cc/triply-api/#creating-an-api-token'
      );
    }
    try {
      this.app = App.get({token: process.env.TOKEN});
    } catch (e) {
      throw new Error(`Failed to create TriplyDB App: ${(e as Error).message}`);
    }
    return this;
  }

  public get path(): string {
    return this.$datasetUrl ?? this.$dsn;
  }

  public async write(pipeline: Pipeline, progress: Progress): Promise<void> {
    const filenames = Array.from(pipeline.stages.keys()).map(
      stageName => pipeline.stages.get(stageName)!.destinationPath
    );

    await this.app!.getAccount(this.accountname)
      .then(async account => account.ensureDataset(this.datasetname))
      .then(async dataset => {
        const appInfo = await this.app!.getInfo();
        this.$datasetUrl = `${appInfo.consoleUrl}/${this.accountname}/${this.datasetname}`;
        progress.line(`uploading data to ${this.$dsn}`);
        await dataset.importFromFiles(filenames, {mergeGraphs: true});
      })
      .catch(e => {
        throw new Error(
          `Failed to upload your data to TriplyDB ${this.accountname}/${
            this.datasetname
          }: ${(e as Error).message}.`
        );
      });
  }
}
