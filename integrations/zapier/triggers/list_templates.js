// Hidden trigger — not a real user-facing trigger. Exists only as the data
// source for the "Template" dynamic dropdown on the Send Document action
// (creates/send_document.js), via `dynamic: 'list_templates.id.name'`. This
// is the standard Zapier pattern for turning an internal-only list call
// into a dropdown of real names instead of making the user paste a raw
// template UUID. `display.hidden: true` keeps it out of the trigger picker
// in the Zap editor — worth double-checking against the current Zapier
// Platform schema when this is first run through `zapier validate`, in
// case the flag name has moved since.

const perform = async (z, bundle) => {
  const response = await z.request({
    url: "https://signedby.ai/api/v1/templates",
  });
  return response.data.templates || [];
};

module.exports = {
  key: "list_templates",
  noun: "Template",
  display: {
    label: "New Template",
    description: "Used internally to power the Template dropdown on the Send Document action.",
    hidden: true,
  },
  operation: {
    type: "polling",
    perform,
    sample: {
      id: "00000000-0000-0000-0000-000000000000",
      name: "Sample Agreement",
      page_count: 3,
      created_at: "2026-08-01T09:00:00.000Z",
    },
  },
};
