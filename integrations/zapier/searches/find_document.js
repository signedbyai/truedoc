// GET /api/v1/documents/[id] — look up a single document (with its
// signers' individual statuses) mid-Zap, e.g. "before doing X, check
// whether this document has actually been signed yet."

const perform = async (z, bundle) => {
  const response = await z.request({
    url: `https://signedby.ai/api/v1/documents/${bundle.inputData.document_id}`,
  });
  return [response.data];
};

module.exports = {
  key: "find_document",
  noun: "Document",
  display: {
    label: "Find Document",
    description: "Look up a document's status (and each recipient's status) by its ID.",
  },
  operation: {
    inputFields: [
      {
        key: "document_id",
        label: "Document ID",
        type: "string",
        required: true,
        helpText: "The document's ID, as returned by the Send Document action or a trigger.",
      },
    ],
    perform,
    sample: {
      id: "00000000-0000-0000-0000-000000000000",
      title: "Sample Agreement",
      status: "sent",
      created_at: "2026-08-18T09:00:00.000Z",
      updated_at: "2026-08-18T09:00:00.000Z",
      expires_at: null,
      signers: [
        {
          email: "signer@example.com",
          name: "Jane Signer",
          status: "sent",
          signed_at: null,
          auth_required: false,
          auth_verified: false,
        },
      ],
    },
  },
};
