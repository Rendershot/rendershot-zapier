/**
 * new_render trigger — subscribe / unsubscribe / perform unit tests.
 */

'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const BASE = 'https://api.rendershot.io';
const API_KEY = 'sk_live_test';
const ZAPIER_URL = 'https://hooks.zapier.com/hooks/catch/12345/abcdef/';

const authData = { apiKey: API_KEY };

describe('new_render.performSubscribe', () => {
  beforeEach(() => nock.cleanAll());

  it('PUTs to /v1/webhook-subscription and returns the endpoint id + url', async () => {
    const scope = nock(BASE)
      .matchHeader('x-api-key', API_KEY)
      .put('/v1/webhook-subscription', { url: ZAPIER_URL })
      .reply(200, {
        id: 'endpoint-1',
        api_key_id: 'key-1',
        url: ZAPIER_URL,
        secret: 'a'.repeat(64),
        enabled: true,
        created_at: '2026-04-19T00:00:00Z',
        updated_at: '2026-04-19T00:00:00Z',
      });

    const result = await appTester(App.triggers.new_render.operation.performSubscribe, {
      authData,
      targetUrl: ZAPIER_URL,
    });

    assert.deepEqual(result, { id: 'endpoint-1', url: ZAPIER_URL });
    assert.ok(scope.isDone());
  });
});

describe('new_render.performUnsubscribe', () => {
  beforeEach(() => nock.cleanAll());

  it('DELETEs /v1/webhook-subscription when the endpoint still points at Zapier', async () => {
    const scope = nock(BASE)
      .delete('/v1/webhook-subscription')
      .reply(204);

    const result = await appTester(App.triggers.new_render.operation.performUnsubscribe, {
      authData,
      subscribeData: { id: 'endpoint-1', url: ZAPIER_URL },
    });

    assert.equal(result.deleted, true);
    assert.ok(scope.isDone());
  });

  it('re-checks current endpoint when subscribeData.url is not a Zapier URL', async () => {
    // subscribeData says user overrode the URL. Trigger should GET
    // current state and skip delete because it's not ours anymore.
    const scope = nock(BASE)
      .get('/v1/webhook-subscription')
      .reply(200, {
        id: 'endpoint-1',
        api_key_id: 'key-1',
        url: 'https://my-own-backend.example.com/wh',
        secret: 'x'.repeat(64),
        enabled: true,
        created_at: '2026-04-19T00:00:00Z',
        updated_at: '2026-04-19T00:00:00Z',
      });

    const result = await appTester(App.triggers.new_render.operation.performUnsubscribe, {
      authData,
      subscribeData: {
        id: 'endpoint-1',
        url: 'https://my-own-backend.example.com/wh',
      },
    });

    assert.equal(result.skipped, true);
    assert.ok(scope.isDone());
  });
});

describe('new_render.perform', () => {
  it('reshapes a job.completed webhook body into output fields', async () => {
    const result = await appTester(App.triggers.new_render.operation.perform, {
      authData,
      cleanedRequest: {
        event: 'job.completed',
        job_id: 'abc123',
        status: 'completed',
        job_type: 'screenshot',
        format: 'png',
        result_url: 'https://api.rendershot.io/v1/jobs/abc123/result',
        created_at: '2026-04-19T10:00:00+00:00',
        completed_at: '2026-04-19T10:00:05+00:00',
        expires_at: '2026-04-20T10:00:05+00:00',
      },
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'abc123:job.completed');
    assert.equal(result[0].event, 'job.completed');
    assert.equal(result[0].status, 'completed');
    assert.equal(
      result[0].result_url,
      'https://api.rendershot.io/v1/jobs/abc123/result',
    );
    assert.equal(result[0].error_message, null);
  });

  it('surfaces error_message for job.failed events', async () => {
    const result = await appTester(App.triggers.new_render.operation.perform, {
      authData,
      cleanedRequest: {
        event: 'job.failed',
        job_id: 'xyz789',
        status: 'failed',
        job_type: 'pdf',
        format: 'pdf',
        error_message: 'Render timed out after 30s',
        created_at: '2026-04-19T10:00:00+00:00',
      },
    });

    assert.equal(result[0].event, 'job.failed');
    assert.equal(result[0].error_message, 'Render timed out after 30s');
    assert.equal(result[0].result_url, null);
  });
});
