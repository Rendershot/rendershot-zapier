/**
 * Creates (capture_screenshot, capture_pdf) — unit tests.
 *
 * We exercise the Zapier app via zapier-platform-core's `createAppTester`,
 * stubbing HTTP responses through the test-mode hook the SDK provides.
 */

'use strict';

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const BASE = 'https://api.rendershot.io';
const API_KEY = 'sk_live_test';

const authData = { apiKey: API_KEY };

describe('capture_screenshot', () => {
  before(() => {
    nock.cleanAll();
  });

  it('POSTs async=true to /v1/screenshot and returns job metadata', async () => {
    const scope = nock(BASE)
      .matchHeader('x-api-key', API_KEY)
      .post('/v1/screenshot', (body) => {
        assert.equal(body.url, 'https://example.com');
        assert.equal(body.async, true);
        assert.equal(body.format, 'png');
        assert.equal(body.full_page, true);
        return true;
      })
      .reply(200, {
        job_id: 'job-1',
        status: 'queued',
        poll_url: '/v1/jobs/job-1',
      });

    const result = await appTester(App.creates.capture_screenshot.operation.perform, {
      authData,
      inputData: {
        url: 'https://example.com',
        format: 'png',
        full_page: true,
        wait_for: 'dom_content_loaded',
      },
    });

    assert.deepEqual(result, {
      job_id: 'job-1',
      status: 'queued',
      poll_url: '/v1/jobs/job-1',
      result_url: 'https://api.rendershot.io/v1/jobs/job-1/result',
    });
    assert.ok(scope.isDone(), 'expected request was not made');
  });

  it('forwards viewport and ai_cleanup when provided', async () => {
    const scope = nock(BASE)
      .post('/v1/screenshot', (body) => {
        assert.deepEqual(body.viewport, { width: 800, height: 600 });
        assert.equal(body.ai_cleanup, 'fast');
        return true;
      })
      .reply(200, { job_id: 'job-2', status: 'queued', poll_url: '/v1/jobs/job-2' });

    await appTester(App.creates.capture_screenshot.operation.perform, {
      authData,
      inputData: {
        url: 'https://example.com',
        viewport_width: 800,
        viewport_height: 600,
        ai_cleanup: 'fast',
      },
    });
    assert.ok(scope.isDone());
  });
});

describe('capture_pdf', () => {
  before(() => {
    nock.cleanAll();
  });

  it('POSTs async=true to /v1/pdf with defaults', async () => {
    const scope = nock(BASE)
      .post('/v1/pdf', (body) => {
        assert.equal(body.url, 'https://example.com');
        assert.equal(body.async, true);
        assert.equal(body.format, 'A4');
        assert.equal(body.orientation, 'portrait');
        assert.equal(body.print_background, true);
        return true;
      })
      .reply(200, {
        job_id: 'pdf-1',
        status: 'queued',
        poll_url: '/v1/jobs/pdf-1',
      });

    const result = await appTester(App.creates.capture_pdf.operation.perform, {
      authData,
      inputData: { url: 'https://example.com' },
    });

    assert.equal(result.result_url, 'https://api.rendershot.io/v1/jobs/pdf-1/result');
    assert.ok(scope.isDone());
  });

  it('respects print_background=false', async () => {
    const scope = nock(BASE)
      .post('/v1/pdf', (body) => {
        assert.equal(body.print_background, false);
        return true;
      })
      .reply(200, { job_id: 'pdf-2', status: 'queued', poll_url: '/v1/jobs/pdf-2' });

    await appTester(App.creates.capture_pdf.operation.perform, {
      authData,
      inputData: {
        url: 'https://example.com',
        print_background: false,
      },
    });
    assert.ok(scope.isDone());
  });
});
