import * as fs from 'fs';

export default async function removeDirectory(
  directory: string
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      if (fs.existsSync(directory)) {
        fs.rm(directory, {recursive: true}, error => {
          if (error !== null) {
            console.error('Error removing directory:', error);
            reject(error);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    } catch (error) {
      console.error('Error removing directory:', error);
      reject(error);
    }
  });
}
