/**
 * `capture_pdf` action.
 *
 * Submits an async PDF render. Same async-mode reasoning as
 * capture_screenshot — PDFs are typically larger than screenshots, so
 * embedding bytes directly in the Zap output is even less viable.
 */

const perform = async (z, bundle) => {
  const input = bundle.inputData;

  const payload = {
    url: input.url,
    format: input.format || 'A4',
    orientation: input.orientation || 'portrait',
    print_background: input.print_background !== false,
    wait_for: input.wait_for || 'dom_content_loaded',
    async: true,
  };

  if (input.delay_ms) payload.delay_ms = Number(input.delay_ms);
  if (input.ai_cleanup) payload.ai_cleanup = input.ai_cleanup;

  const response = await z.request({
    url: '/v1/pdf',
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
  key: 'capture_pdf',
  noun: 'PDF',
  display: {
    label: 'Capture PDF',
    description:
      'Render a URL as a PDF. Runs asynchronously — use the New Render trigger to act on the finished file, or follow the returned result URL.',
  },
  operation: {
    cleanInputData: false,
    inputFields: [
      {
        key: 'url',
        label: 'URL',
        type: 'string',
        required: true,
        helpText: 'The web page to render. Include the scheme (https or http).',
      },
      {
        key: 'format',
        label: 'Paper size',
        type: 'string',
        choices: { A4: 'A4', Letter: 'Letter', A3: 'A3', Legal: 'Legal' },
        default: 'A4',
      },
      {
        key: 'orientation',
        label: 'Orientation',
        type: 'string',
        choices: { portrait: 'Portrait', landscape: 'Landscape' },
        default: 'portrait',
      },
      {
        key: 'print_background',
        label: 'Print background graphics',
        type: 'boolean',
        default: 'true',
      },
      {
        key: 'wait_for',
        label: 'Wait for',
        type: 'string',
        default: 'dom_content_loaded',
        choices: {
          load: 'load',
          dom_content_loaded: 'dom_content_loaded',
          network_idle: 'network_idle',
          commit: 'commit',
        },
      },
      {
        key: 'delay_ms',
        label: 'Extra delay (ms)',
        type: 'integer',
        default: '0',
      },
      {
        key: 'ai_cleanup',
        label: 'AI cleanup',
        type: 'string',
        required: false,
        choices: { fast: 'Fast (1 credit)', thorough: 'Thorough (3 credits)' },
        helpText: 'Remove cookie banners and popups before rendering.',
      },
    ],

    perform,

    sample: {
      job_id: '9fa85b00-7a0d-4c25-8c7b-1baf06d8c71a',
      status: 'queued',
      poll_url: '/v1/jobs/9fa85b00-7a0d-4c25-8c7b-1baf06d8c71a',
      result_url:
        'https://api.rendershot.io/v1/jobs/9fa85b00-7a0d-4c25-8c7b-1baf06d8c71a/result',
    },

    outputFields: [
      { key: 'job_id', label: 'Job ID' },
      { key: 'status', label: 'Status' },
      { key: 'poll_url', label: 'Poll URL (relative)' },
      { key: 'result_url', label: 'Result URL' },
    ],
  },
};
