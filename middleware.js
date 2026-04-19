/**
 * Request middleware: attach auth headers + base URL to every outbound call.
 * Response middleware: surface Rendershot's `{code, message}` error bodies
 * so users see "Credits exhausted" instead of a generic "HTTP 402".
 */

function includeAuthHeaders(request, z, bundle) {
  const headers = { ...(request.headers || {}) };
  if (bundle.authData && bundle.authData.apiKey) {
    headers['X-API-Key'] = bundle.authData.apiKey;
  }

  // Default base URL lets us ship once and point at staging/self-hosted via
  // an auth field override without republishing the app.
  const baseUrl = (bundle.authData && bundle.authData.baseUrl) || 'https://api.rendershot.io';
  if (request.url && request.url.startsWith('/')) {
    request.url = `${baseUrl.replace(/\/+$/, '')}${request.url}`;
  }

  return { ...request, headers };
}

function handleApiErrors(response, z) {
  // httpResponseErrors is the SDK-friendly bag of rejection reasons.
  if (response.status < 400) return response;

  let detail;
  try {
    const body = response.json || (response.content && JSON.parse(response.content));
    detail = body && body.detail;
  } catch {
    detail = null;
  }

  // Rendershot error shape: { detail: { code, message, retry_after? } }
  if (detail && typeof detail === 'object' && detail.code) {
    if (response.status === 401) {
      throw new z.errors.RefreshAuthError(detail.message || 'Invalid API key.');
    }
    const message = detail.message || `Rendershot error: ${detail.code}`;
    throw new Error(message);
  }

  if (response.status === 401) {
    throw new z.errors.RefreshAuthError('Invalid API key.');
  }

  throw new Error(
    typeof detail === 'string' && detail
      ? detail
      : `Rendershot API error ${response.status}`,
  );
}

module.exports = {
  beforeRequest: [includeAuthHeaders],
  afterResponse: [handleApiErrors],
};
