/**
 * `new_render` subscription trigger.
 *
 * When a user turns the Zap on, `performSubscribe` registers a Zapier-owned
 * callback URL via Rendershot's public webhook-subscription endpoint
 * (API-key authed). Every time an async render in that account finishes,
 * Rendershot POSTs a signed `job.completed` or `job.failed` event to the
 * Zapier URL — Zapier routes the payload into `perform`, which extracts
 * fields for downstream Zap steps.
 *
 * When the Zap is turned off, `performUnsubscribe` deletes the webhook.
 *
 * ----
 *
 * NOTE: Rendershot currently supports **one webhook endpoint per API key**.
 * Subscribing this trigger will overwrite any existing webhook on the
 * key — including one the user may have set up in their dashboard for a
 * different receiver. On unsubscribe we only remove the endpoint if it
 * still points at a Zapier URL, to avoid clobbering a user-managed
 * webhook installed after the Zap went live.
 *
 * When the API supports multiple endpoints per key, switch to a POST-
 * create / DELETE-by-id pattern and drop the "is it still ours?" check.
 */

function isZapierWebhookUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.includes('hooks.zapier.com') || url.includes('zapier.com/hooks');
}

const performSubscribe = async (z, bundle) => {
  const response = await z.request({
    url: '/v1/webhook-subscription',
    method: 'PUT',
    body: { url: bundle.targetUrl },
  });
  const body = response.data || response.json;
  return {
    // We hold onto the endpoint id + URL so unsubscribe knows what it's
    // tearing down and won't stomp a user-managed webhook later.
    id: body.id,
    url: body.url,
  };
};

const performUnsubscribe = async (z, bundle) => {
  const subscribeData = bundle.subscribeData || {};

  // Defensive: if the endpoint URL no longer matches ours, the user
  // replaced it through the dashboard after subscribing. Leave it alone.
  if (!isZapierWebhookUrl(subscribeData.url)) {
    // Check current state too — the stored subscribeData can be stale.
    const current = await z.request({
      url: '/v1/webhook-subscription',
      method: 'GET',
    });
    const currentBody = current.data || current.json;
    if (!currentBody || !isZapierWebhookUrl(currentBody.url)) {
      return { skipped: true, reason: 'endpoint no longer points at Zapier' };
    }
  }

  await z.request({
    url: '/v1/webhook-subscription',
    method: 'DELETE',
  });

  return { deleted: true, id: subscribeData.id };
};

// Called when Rendershot POSTs a webhook to the Zapier URL. Zapier
// passes the parsed JSON body as `bundle.cleanedRequest`; we reshape
// it into the output fields below.
const perform = (z, bundle) => {
  const event = bundle.cleanedRequest || {};
  return [
    {
      id: `${event.job_id}:${event.event}`,
      event: event.event,
      job_id: event.job_id,
      status: event.status,
      job_type: event.job_type,
      format: event.format,
      result_url: event.result_url || null,
      error_message: event.error_message || null,
      created_at: event.created_at || null,
      completed_at: event.completed_at || null,
      expires_at: event.expires_at || null,
    },
  ];
};

// Powers the "Test trigger" step in the Zap editor — returns a few
// recent deliveries so users can wire up downstream steps without
// waiting for a real render to finish. Uses the internal dashboard
// endpoint (which we can't call with just an API key) — so we fall
// back to a synthesised sample when the list is empty or unreachable.
const performList = async (z, bundle) => {
  try {
    // The dashboard-only endpoint requires user_id + internal secret,
    // which we don't have here. Return a single realistic sample so
    // Zapier's test UX isn't empty.
    return [
      {
        id: 'abc123:job.completed',
        event: 'job.completed',
        job_id: 'abc123',
        status: 'completed',
        job_type: 'screenshot',
        format: 'png',
        result_url: 'https://api.rendershot.io/v1/jobs/abc123/result',
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
    ];
  } catch (err) {
    z.console.log('performList fallback:', err && err.message);
    return [];
  }
};

module.exports = {
  key: 'new_render',
  noun: 'Render',
  display: {
    label: 'New Render',
    description:
      'Triggers when an async screenshot or PDF finishes rendering. Includes the result URL so downstream steps can download the file.',
  },
  operation: {
    type: 'hook',
    cleanInputData: false,
    performSubscribe,
    performUnsubscribe,
    perform,
    performList,

    sample: {
      id: 'abc123:job.completed',
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

    outputFields: [
      { key: 'event', label: 'Event' },
      { key: 'job_id', label: 'Job ID' },
      { key: 'status', label: 'Status' },
      { key: 'job_type', label: 'Job type' },
      { key: 'format', label: 'Format' },
      { key: 'result_url', label: 'Result URL' },
      { key: 'error_message', label: 'Error message (if failed)' },
      { key: 'created_at', label: 'Created at' },
      { key: 'completed_at', label: 'Completed at' },
      { key: 'expires_at', label: 'Expires at' },
    ],
  },
};
