/* eslint-disable no-undef, max-len */
jest.dontMock('../UploadManager');
jest.dontMock('../index');
jest.dontMock('classnames');
jest.dontMock('lodash');

import React from 'react';
import { shallow, configure } from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import { jsdom } from 'jsdom';
import nock from 'nock';

const FileUploader = require('../index');
const UploadManager = FileUploader.UploadManager;
const uploadStatus = FileUploader.status;

configure({ adapter: new Adapter() });

describe('UploadManager', () => {
  let stringClass = 'receiver',
    arrayClass = ['react', 'receiver'],
    uploadPath = 'http://localhost:3000/api/upload',
    timeout = {
      response: 1000,
      deadline: 1000,
    },
    children = (<p>children</p>),
    uploadManager,
    onUploadAbort,
    onUploadStart,
    onUploadProgress,
    onUploadEnd,
    formDataParser,
    err,
    errorResponse,
    successResponse,
    errorHandler,
    file,
    fileCopy;

  beforeEach(() => {
    global.document = jsdom();
    global.window = document.parentWindow;

    onUploadAbort = jest.genMockFn();
    onUploadStart = jest.genMockFn();
    onUploadProgress = jest.genMockFn();
    onUploadEnd = jest.genMockFn();
    formDataParser = jest.genMockFn();

    file = { id: 'fileId' };
    fileCopy = JSON.parse(JSON.stringify(file));

    err = new Error('not found');
    errorResponse = { body: { success: false, errors: { message: 'not found' } } };
    successResponse = { body: { success: true } };
    errorHandler = UploadManager.defaultProps.uploadErrorHandler;

    nock('http://localhost:3000')
      .filteringRequestBody(() => '*')
      .post('/api/upload', '*')
      .reply(200, successResponse);

    uploadManager = shallow(
      <UploadManager
        reqConfigs={{
          accept: 'application/json',
          method: 'post',
          timeout: timeout,
          withCredentials: true,
        }}
        customClass={stringClass}
        uploadUrl={uploadPath}
        onUploadAbort={onUploadAbort}
        onUploadStart={onUploadStart}
        onUploadProgress={onUploadProgress}
        onUploadEnd={onUploadEnd}
        formDataParser={formDataParser}
      >
        {children}
      </UploadManager>
    )
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('render()', () => {
    it('should render ul element by default', () => {
      expect(uploadManager.type()).toEqual('ul');
      expect(uploadManager.childAt(0).type()).toEqual('p');
    });

    it('should render wrapper element according to component props', () => {
      uploadManager.setProps({ component: 'div' });
      expect(uploadManager.type()).toEqual('div');
    });

    it('should render a wrapper with customClass in string', () => {
      expect(uploadManager.hasClass(stringClass)).toBe(true);
    });

    it('should render a wrapper with customClass in array', () => {
      uploadManager.setProps({ customClass: arrayClass });

      arrayClass.forEach((classname) => {
        expect(uploadManager.hasClass(classname)).toBe(true);
      });
    });
  });

  describe('uploadErrorHandler()', () => {
    it('should return an object contains key of `error` and `result`', () => {
      const result = errorHandler(null, successResponse);
      expect(result.error).toBeNull();
      expect(result.result).toEqual(successResponse.body);
    });

    it('should return an object with key of `error` with value equals to the first argument if it is not empty', () => {
      const result = errorHandler(err, successResponse);
      expect(result.error).toEqual(err.message);
      expect(result.result).toEqual(successResponse.body);
    });

    it('should return an object with key of `error` with value equals to the value of `body.error` of the second argument if it is not empty', () => {
      const result = errorHandler(null, errorResponse);
      expect(result.error).toEqual(errorResponse.body.errors);
      delete errorResponse.body.errors;
      expect(result.result).toEqual(errorResponse.body);
    });
  });

  describe('upload()', () => {
    it('should declare the request instance', () => {
      const instance = uploadManager.instance();
      instance.upload(instance.props.uploadUrl, file);

      const request = instance.requests[file.id];
      expect(request._timeout).toEqual(timeout);
    });

    it('should call `props.onUploadStart` function if it is given', () => {
      const instance = uploadManager.instance();
      instance.upload(instance.props.uploadUrl, file);
      expect(onUploadStart).toBeCalledWith(file.id, { status: uploadStatus.UPLOADING });
      expect(file).toEqual(fileCopy);
    });

    it('should call `props.formDataParser` function if it is given', () => {
      const instance = uploadManager.instance();
      const data = {};
      instance.upload(instance.props.uploadUrl, { data });
      expect(formDataParser).toBeCalledWith(new FormData(), data);
    });
  });

  describe('abort()', () => {
    let instance, request;

    beforeEach(() => {
      instance = uploadManager.instance();
      instance.upload(instance.props.uploadUrl, file);
      request = instance.requests[file.id];
      request.abort = jest.genMockFn();
    });

    afterEach(() => {
      request.abort.mockClear();
    });

    it('should call `request.abort()` and `props.onUploadAbort()` if request instance is found.', () => {
      instance.abort();
      expect(request.abort).not.toBeCalled();

      instance.abort(file);
      expect(request.abort).toBeCalled();
      expect(onUploadAbort).toBeCalledWith(file.id, { status: uploadStatus.ABORTED });
    });
  });

  describe('onProgress()', () => {
    let instance, request, progress = 10;

    beforeEach(() => {
      instance = uploadManager.instance();
      instance.upload(instance.props.uploadUrl, file);
      request = instance.requests[file.id];
      request.aborted = false;
      request.xhr = {};
    });

    it('should call `props.onUploadProgress()` if request is not aborted', (done) => {
      instance.onProgress(file.id, progress);
      setTimeout(() => {
        expect(onUploadProgress).toBeCalledWith(file.id, { progress, status: uploadStatus.UPLOADING });
        done();
      }, instance.props.progressDebounce);
    });
  });
});
/* eslint-enable no-undef, max-len */
