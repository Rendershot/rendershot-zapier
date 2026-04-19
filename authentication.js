/**
 * API-key authentication.
 *
 * Zapier's auth-test step calls `GET /v1/ping` with the user's key in
 * `X-API-Key`. The endpoint returns `{ ok, email, api_key_prefix, ... }`
 * — we use `email` as the connection label so users see "Connected as
 * alice@acme.com" in the Zap editor rather than a meaningless prefix.
 */

module.exports = {
  type: 'custom',

  fields: [
    {
      key: 'apiKey',
      label: 'API Key',
      required: true,
      type: 'password',
      helpText:
        'Your Rendershot API key. Create one at https://rendershot.io/dashboard/keys (starts with `sk_live_`).',
    },
  ],

  // Called by Zapier whenever it wants to verify the key is still valid.
  // The middleware (see middleware.js) injects the X-API-Key header and
  // resolves the relative URL to the configured base.
  test: {
    url: '/v1/ping',
    method: 'GET',
  },

  // Shown under the connection in the Zap editor — the `email` field comes
  // from the /v1/ping response body, which Zapier treats as inputData.
  connectionLabel: '{{bundle.inputData.email}}',
};
