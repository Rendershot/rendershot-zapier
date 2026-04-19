# rendershot-zapier

[Zapier](https://zapier.com) app for the [Rendershot](https://rendershot.io) screenshot & PDF generation API. Lets anyone use Rendershot inside a Zap — no code — by wiring it up to Google Sheets, Slack, Typeform, and the 7000+ other apps in the Zapier ecosystem.

## What it exposes

| Block | Type | What it does |
|---|---|---|
| **Capture Screenshot** | Action | POSTs a URL to `/v1/screenshot` (async) and returns `job_id` + `result_url`. |
| **Capture PDF** | Action | POSTs a URL to `/v1/pdf` (async) and returns `job_id` + `result_url`. |
| **New Render** | Trigger | Fires when any async render in the connected account finishes. Outputs `job_id`, `status`, `result_url`, `error_message`, timestamps. |

Under the hood the trigger is a Rendershot webhook with Zapier as the receiver. Turning the Zap on registers a Zapier URL via `PUT /v1/webhook-subscription`; turning it off deletes it.

## Typical Zaps

- New row in Google Sheets → **Capture Screenshot** (of the URL in column B) → upload to Dropbox
- Schedule (Monday 09:00) → **Capture PDF** (pricing page) → email to team
- Typeform submitted → **Capture Screenshot** (of the submitted URL) → post to Slack

## Connecting

In the Zap editor:
1. Pick **Rendershot** as the trigger or action.
2. Paste your API key (starts with `sk_live_`). Get one at [rendershot.io/dashboard/keys](https://rendershot.io/dashboard/keys).
3. Zapier calls `GET /v1/ping` to verify the key and shows "Connected as your@email.com".

The ping call is free — credits are debited only when a render is actually submitted.

## Repo layout

```
rendershot-zapier/
├── index.js                  # app entrypoint
├── authentication.js         # API-key auth + /v1/ping test
├── middleware.js             # injects X-API-Key, normalises errors
├── creates/
│   ├── capture_screenshot.js
│   └── capture_pdf.js
├── triggers/
│   └── new_render.js         # subscribe/unsubscribe/perform/performList
├── test/                     # node --test + nock HTTP stubs
└── package.json
```

## Development

```bash
npm install
npm test          # unit tests (node:test + nock)
npx zapier validate   # schema + integration-check audit
```

### Deploy flow

```bash
npx zapier login            # one-time
npx zapier register "Rendershot"   # first push only
npx zapier push             # deploy current version
npx zapier invite user@example.com   # try a private Zap before promoting
npx zapier promote 1.0.0    # submit a version to the public Directory
```

Zapier Directory review takes ~2–4 weeks.

## Webhook caveat (current API limitation)

Rendershot's backend currently supports **one webhook endpoint per API key**. If a user has already registered a webhook through the Rendershot dashboard, subscribing this trigger will overwrite it. On unsubscribe we only delete the endpoint if it still points at a Zapier URL, so we don't clobber a user-managed webhook installed after the Zap went live.

Once the API supports multiple endpoints per key, switch subscribe/unsubscribe in `triggers/new_render.js` to a POST-create / DELETE-by-id pattern and drop the "is it still ours?" check.

## License

MIT — see [LICENSE](LICENSE).
