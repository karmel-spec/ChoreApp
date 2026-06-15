const {
  json,
  memberFromAuthHeader,
  requireAdmin,
  serviceClient
} = require("./_supabase");

function publicNotification(row) {
  return {
    id: row.id,
    kind: row.kind,
    destination: row.destination,
    body: row.body,
    providerMessageId: row.provider_message_id,
    status: row.status,
    createdAt: row.created_at,
    recipientId: row.recipient_id,
    recipientName: row.recipient?.display_name || "",
    createdBy: row.created_by,
    createdByName: row.sender?.display_name || ""
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can read notification logs." });

  const limit = Math.min(120, Math.max(1, Number(event.queryStringParameters?.limit || 80)));
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from("notification_log")
    .select(`
      id,
      kind,
      destination,
      body,
      provider_message_id,
      status,
      created_at,
      recipient_id,
      created_by,
      recipient:family_members!notification_log_recipient_id_fkey(display_name),
      sender:family_members!notification_log_created_by_fkey(display_name)
    `)
    .eq("family_id", actor.family_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return json(500, { error: error.message });
  return json(200, { notifications: (data || []).map(publicNotification) });
};
