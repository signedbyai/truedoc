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
      // "password" (not "string") masks the key as it's typed/displayed —
      // Zapier publishing requirement 5.5. Flagged in review 2026-08-23.
      type: "password",
      required: true,
      helpText:
        "Find or generate your API key in SignedBy under Settings → Integration & API. Requires the Pro plan or higher.",
    },
  ],
  test: testAuth,
  // org_name now comes back from the templates test call (added to
  // GET /api/v1/templates's response specifically for this) so someone
  // with multiple SignedBy accounts can tell their Zapier connections
  // apart — Zapier publishing requirement 5.6 (a fixed "SignedBy account"
  // label for every connection failed review 2026-08-23). Deliberately an
  // org name, not the integration's own name, per that same requirement.
  connectionLabel: "{{org_name}}",
};
