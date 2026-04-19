/**
 * Rendershot Zapier app entrypoint.
 *
 * Everything the CLI and the Zapier platform need to boot the app lives
 * in this single export: authentication, the request/response
 * middleware that injects `X-API-Key` + maps API errors, and the set of
 * triggers / creates we expose.
 */

const authentication = require('./authentication');
const { beforeRequest, afterResponse } = require('./middleware');

const captureScreenshot = require('./creates/capture_screenshot');
const capturePdf = require('./creates/capture_pdf');
const newRender = require('./triggers/new_render');

const pkg = require('./package.json');

module.exports = {
  version: pkg.version,
  platformVersion: require('zapier-platform-core').version,

  authentication,

  beforeRequest,
  afterResponse,

  triggers: {
    [newRender.key]: newRender,
  },

  creates: {
    [captureScreenshot.key]: captureScreenshot,
    [capturePdf.key]: capturePdf,
  },

  searches: {},

  resources: {},
};
