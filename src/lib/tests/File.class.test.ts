import * as fs from 'fs';
import * as path from 'path';
import File from '../File.class.js';
import * as chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('File Class', () => {
  describe('constructor', () => {
    it('should set properties correctly', () => {
      const file = new File(
        `file://${path.join('./static/example/config.yml')}`
      );
      expect(file).to.be.an.instanceOf(File);
      expect(file).to.have.property('$path');
      expect(file).to.have.property('skipExistsCheck');
      expect(file).to.have.property('$id');
    });
  });
  describe('validate', () => {
    it('should validate a valid file path', () => {
      const path = './static/example/config.yml';
      const validFilePath = `file://${path}`;
      const file = new File(validFilePath);
      expect(file.validate());
      expect(file.path).to.equal(path);
    });

    it('should throw an error for an invalid file path', () => {
      const filePath = 'invalid/file/path.txt';
      const file = new File(filePath);
      expect(file.validate.bind(file)).to.throw(
        'The filename `invalid/file/path.txt` should start with `file://`'
      );
    });

    it('should throw an error if file does not exist', () => {
      const filePath = 'file://nonexistent/file.txt';
      const file = new File(filePath);
      expect(file.validate.bind(file)).to.throw(
        'File not found: `nonexistent/file.txt`'
      );
    });

    it('should skip exists check when skipExistsCheck is true', () => {
      const filePath = 'file://nonexistent/file.txt';
      const file = new File(filePath, true);
      expect(() => file.validate()).to.not.throw();
      expect(file.path).to.equal('nonexistent/file.txt');
    });
  });

  describe('getStream', () => {
    beforeEach(() => {
      const filePath = 'file.txt';
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, 'Initial content');
      }
    });
    afterEach(() => {
      const filePath = 'file.txt';
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      if (fs.existsSync('./new')) {
        fs.rmSync('./new', {recursive: true, force: true});
      }
    });
    it('should create a write stream for a new file', () => {
      const filePath = 'new/file.txt';
      const file = new File(filePath);
      const writeStream = file.getStream();
      expect(writeStream).to.be.an.instanceOf(fs.WriteStream);
    });

    it('should append to an existing file when append is true', () => {
      const filePath = 'file.txt';
      const file = new File(filePath);
      const writeStream = file.getStream(true);
      expect(writeStream).to.be.an.instanceOf(fs.WriteStream);
    });
    it('should create parent directories if they do not exist', () => {
      const filePath = 'file://new/directory/nested/file.txt';
      const file = new File(filePath, true).validate();
      const writeStream = file.getStream();
      expect(writeStream).to.be.an.instanceOf(fs.WriteStream);
      expect(
        fs.existsSync(path.dirname(filePath).replace('file://', ''))
      ).to.equal(true);
    });
  });
});
