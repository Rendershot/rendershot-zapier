/**
 * `capture_screenshot` action.
 *
 * Submits an async screenshot render to Rendershot and returns the
 * resulting job metadata (including `result_url`). The render itself
 * runs in the background — users can either:
 *   - use the `new_render` trigger to react when the render finishes, or
 *   - follow `result_url` immediately (it will serve a 24h-expiring file
 *     once the job is complete).
 *
 * Using async_mode for Zap consistency: Zaps time out on long actions,
 * and PNG bytes don't travel well through the Zapier data plane anyway.
 */

const WAIT_FOR_CHOICES = ['load', 'dom_content_loaded', 'network_idle', 'commit'];

const perform = async (z, bundle) => {
  const input = bundle.inputData;

  const payload = {
    url: input.url,
    format: input.format || 'png',
    full_page: Boolean(input.full_page),
    wait_for: input.wait_for || 'dom_content_loaded',
    async: true,
  };

  if (input.viewport_width || input.viewport_height) {
    payload.viewport = {
      width: Number(input.viewport_width) || 1280,
      height: Number(input.viewport_height) || 720,
    };
  }
  if (input.delay_ms) payload.delay_ms = Number(input.delay_ms);
  if (input.ai_cleanup) payload.ai_cleanup = input.ai_cleanup;

  const response = await z.request({
    url: '/v1/screenshot',
    method: 'POST',
    body: payload,
  });

  const body = response.data || response.json;
  return {
    job_id: body.job_id,
    status: body.status,
    poll_url: body.poll_url,
    result_url: `https://api.rendershot.io${body.poll_url}/result`,
  };
};

module.exports = {
  key: 'capture_screenshot',
  noun: 'Screenshot',
  display: {
    label: 'Capture Screenshot',
    description:
      'Take a screenshot of a URL as PNG or JPEG. Runs asynchronously — use the New Render trigger to act on the finished image, or follow the returned result URL.',
  },
  operation: {
    cleanInputData: false,
    inputFields: [
      {
        key: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        helpText: 'The web page to screenshot. Include the scheme (https or http).',
      },
      {
        key: 'format',
        label: 'Image format',
        type: 'string',
        choices: { png: 'PNG', jpeg: 'JPEG' },
        default: 'png',
      },
      {
        key: 'full_page',
        label: 'Full page',
        type: 'boolean',
        default: 'false',
        helpText: 'Capture the entire scrollable page, not just the viewport.',
      },
      {
        key: 'viewport_width',
        label: 'Viewport width (px)',
        type: 'integer',
        default: '1280',
      },
      {
        key: 'viewport_height',
        label: 'Viewport height (px)',
        type: 'integer',
        default: '720',
      },
      {
        key: 'wait_for',
        label: 'Wait for',
        type: 'string',
        default: 'dom_content_loaded',
        choices: WAIT_FOR_CHOICES.reduce((acc, v) => ({ ...acc, [v]: v }), {}),
        helpText:
          "When to consider the page ready. For sites with lazy-loaded content try 'network_idle'.",
      },
      {
        key: 'delay_ms',
        label: 'Extra delay (ms)',
        type: 'integer',
        default: '0',
        helpText: 'Additional wait after page-ready before capturing. Max 10000.',
      },
      {
        key: 'ai_cleanup',
        label: 'AI cleanup',
        type: 'string',
        required: false,
        choices: { fast: 'Fast (1 credit)', thorough: 'Thorough (3 credits)' },
        helpText: 'Remove cookie banners and popups before capture.',
      },
    ],

    perform,

    sample: {
      job_id: '1c6e7828-8215-4221-81fd-23c36ace09b2',
      status: 'queued',
      poll_url: '/v1/jobs/1c6e7828-8215-4221-81fd-23c36ace09b2',
      result_url:
        'https://api.rendershot.io/v1/jobs/1c6e7828-8215-4221-81fd-23c36ace09b2/result',
    },

    outputFields: [
      { key: 'job_id', label: 'Job ID' },
      { key: 'status', label: 'Status' },
      { key: 'poll_url', label: 'Poll URL (relative)' },
      { key: 'result_url', label: 'Result URL' },
    ],
  },
};
