const authentication = require("./authentication");
const documentCompleted = require("./triggers/document_completed");
const documentDeclined = require("./triggers/document_declined");
const listTemplates = require("./triggers/list_templates");
const sendDocument = require("./creates/send_document");
const findDocument = require("./searches/find_document");

const { version } = require("./package.json");

// Attaches the org's API key to every outbound request as
// `Authorization: Bearer <key>` — matches extractApiKey() in
// signedby-app/src/lib/api-key.ts. Runs on every call so individual
// triggers/creates/searches never need to touch auth headers themselves.
const includeApiKey = (request, z, bundle) => {
  if (bundle.authData && bundle.authData.api_key) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.api_key}`;
  }
  return request;
};

// SignedBy's API returns errors as `{ error: "message" }` with a real HTTP
// status (401/402/404/429/etc, see api-auth.ts, checkRateLimit, and every
// /api/v1/* route). Surface that message directly rather than Zapier's
// generic "unexpected status code" text, so a user sees e.g. "Rate limit
// exceeded. Try again later." instead of a bare 429.
const surfaceApiErrors = (response, z, bundle) => {
  if (response.status >= 400) {
    const message = (response.data && response.data.error) || `Unexpected error (HTTP ${response.status}).`;
    throw new z.errors.Error(message, "SignedByApiError", response.status);
  }
  return response;
};

module.exports = {
  version,
  platformVersion: require("zapier-platform-core").version,

  authentication,

  beforeRequest: [includeApiKey],
  afterResponse: [surfaceApiErrors],

  triggers: {
    [documentCompleted.key]: documentCompleted,
    [documentDeclined.key]: documentDeclined,
    [listTemplates.key]: listTemplates,
  },

  creates: {
    [sendDocument.key]: sendDocument,
  },

  searches: {
    [findDocument.key]: findDocument,
  },

  resources: {},
};
