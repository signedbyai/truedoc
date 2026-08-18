// Polling trigger — GET /api/v1/documents?status=declined. Same
// re-sort-by-updated_at approach as document_completed.js, same reasoning.

const perform = async (z, bundle) => {
  const response = await z.request({
    url: "https://signedby.ai/api/v1/documents",
    params: {
      status: "declined",
      limit: 100,
    },
  });

  const documents = response.data.documents || [];
  return documents
    .slice()
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
};

module.exports = {
  key: "document_declined",
  noun: "Document",
  display: {
    label: "New Document Declined",
    description: "Triggers when a recipient declines to sign a document you sent.",
  },
  operation: {
    type: "polling",
    perform,
    sample: {
      id: "00000000-0000-0000-0000-000000000000",
      title: "Sample Agreement",
      status: "declined",
      created_at: "2026-08-18T09:00:00.000Z",
      updated_at: "2026-08-18T09:45:00.000Z",
      expires_at: null,
    },
  },
};
