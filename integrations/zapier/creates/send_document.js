// POST /api/v1/documents (single-signer path). Multi-party send is
// deliberately NOT in v1 — see ZAPIER_INTEGRATION_SCOPE.md — Zapier's flat
// action-field UI doesn't map cleanly onto the role-numbered signers array
// without its own dedicated pass.

const perform = async (z, bundle) => {
  const body = {
    template_id: bundle.inputData.template_id,
    signer: {
      email: bundle.inputData.signer_email,
      name: bundle.inputData.signer_name || null,
      auth_required: Boolean(bundle.inputData.auth_required),
    },
  };
  if (bundle.inputData.invite_subject) body.invite_subject = bundle.inputData.invite_subject;
  if (bundle.inputData.invite_message) body.invite_message = bundle.inputData.invite_message;
  if (bundle.inputData.expires_at) body.expires_at = bundle.inputData.expires_at;

  const response = await z.request({
    url: "https://signedby.ai/api/v1/documents",
    method: "POST",
    body,
  });
  return response.data;
};

module.exports = {
  key: "send_document",
  noun: "Document",
  display: {
    label: "Send Document",
    description: "Create a document from a template and send it to one recipient for signature.",
  },
  operation: {
    inputFields: [
      {
        key: "template_id",
        label: "Template",
        type: "string",
        required: true,
        // Dynamic dropdown — see triggers/list_templates.js.
        dynamic: "list_templates.id.name",
        helpText: "Pick the SignedBy template to send. Must already have fields placed on it.",
      },
      {
        key: "signer_email",
        label: "Recipient Email",
        type: "string",
        required: true,
      },
      {
        key: "signer_name",
        label: "Recipient Name",
        type: "string",
        required: false,
      },
      {
        key: "auth_required",
        label: "Require Email Verification to Open",
        type: "boolean",
        required: false,
        default: "false",
        helpText: "If enabled, the recipient must verify a one-time code sent to their email before they can view the document.",
      },
      {
        key: "invite_subject",
        label: "Custom Invite Email Subject",
        type: "string",
        required: false,
      },
      {
        key: "invite_message",
        label: "Custom Invite Email Message",
        type: "text",
        required: false,
      },
      {
        key: "expires_at",
        label: "Expires At",
        type: "datetime",
        required: false,
        helpText: "Optional — if set, the document can no longer be signed after this time.",
      },
    ],
    perform,
    sample: {
      id: "00000000-0000-0000-0000-000000000000",
      status: "sent",
      expires_at: null,
      auth_required: false,
    },
  },
};
