'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const BASE = 'https://api.rendershot.io';

describe('authentication.test', () => {
  beforeEach(() => nock.cleanAll());

  it('calls GET /v1/ping with the API key header', async () => {
    const scope = nock(BASE)
      .matchHeader('x-api-key', 'sk_live_test')
      .get('/v1/ping')
      .reply(200, {
        ok: true,
        api_key_id: 'key-1',
        api_key_prefix: 'sk_live_X',
        user_id: 'user-1',
        email: 'alice@acme.com',
      });

    const result = await appTester(App.authentication.test, {
      authData: { apiKey: 'sk_live_test' },
    });

    assert.equal(result.ok, true);
    assert.equal(result.email, 'alice@acme.com');
    assert.ok(scope.isDone());
  });

  it('raises RefreshAuthError on 401', async () => {
    nock(BASE)
      .get('/v1/ping')
      .reply(401, { detail: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key.' } });

    await assert.rejects(
      () =>
        appTester(App.authentication.test, {
          authData: { apiKey: 'sk_live_bogus' },
        }),
      /Invalid or revoked API key/,
    );
  });
});
