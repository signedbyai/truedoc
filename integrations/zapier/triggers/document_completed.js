// Polling trigger — GET /api/v1/documents?status=completed. See
// ZAPIER_INTEGRATION_SCOPE.md for why this is polling, not a REST Hook,
// in v1.
//
// Known limitation, deliberately worked around below: the endpoint sorts
// by `created_at` (when the document was first created), not by when it
// most recently transitioned to "completed" — there's no separate
// "completed_at" field. A document created weeks ago that just finished
// signing today would otherwise sort as if it were old news. Fetch a
// wider page than Zapier's usual page size and re-sort by `updated_at`
// (which does get bumped on every status change) before returning, so
// "recently completed" is a reasonable approximation of the truth even
// though the API's own default order isn't quite that.

const perform = async (z, bundle) => {
  const response = await z.request({
    url: "https://signedby.ai/api/v1/documents",
    params: {
      status: "completed",
      limit: 100,
    },
  });

  const documents = response.data.documents || [];
  return documents
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

module.exports = {
  key: "document_completed",
  noun: "Document",
  display: {
    label: "New Document Completed",
    description: "Triggers when a document you sent has been signed by everyone and is fully complete.",
  },
  operation: {
    type: "polling",
    perform,
    sample: {
      id: "00000000-0000-0000-0000-000000000000",
      title: "Sample Agreement",
      status: "completed",
      created_at: "2026-08-18T09:00:00.000Z",
      updated_at: "2026-08-18T10:15:00.000Z",
      expires_at: null,
    },
  },
};
