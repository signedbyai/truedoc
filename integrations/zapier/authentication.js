// Custom auth: a single org API key (generated in SignedBy under
// Settings → Integration & API), sent as `Authorization: Bearer <key>` —
// matches extractApiKey() in signedby-app/src/lib/api-key.ts exactly.
//
// Test request hits GET /api/v1/templates rather than /documents, since it
// returns 200 with an empty array for a brand-new org with zero templates
// yet — "is this key valid" should never false-negative on an empty
// account. See ZAPIER_INTEGRATION_SCOPE.md.

const testAuth = (z, bundle) => {
  return z
    .request({
      url: "https://signedby.ai/api/v1/templates",
    })
    .then((response) => {
      if (response.status === 401) {
        throw new z.errors.Error(
          "Invalid API key — check Settings → Integration & API in your SignedBy dashboard.",
          "AuthenticationError",
          response.status
        );
      }
      return response.data;
    });
};

module.exports = {
  type: "custom",
  fields: [
    {
      key: "api_key",
      type: "string",
      required: true,
      helpText:
        "Find or generate your API key in SignedBy under Settings → Integration & API. Requires the Pro plan or higher.",
    },
  ],
  test: testAuth,
  // Nothing sensitive enough to show beyond confirming the connection —
  // the templates test call doesn't return anything identity-scoped worth
  // surfacing here (no org name in that response today).
  connectionLabel: "SignedBy account",
};
