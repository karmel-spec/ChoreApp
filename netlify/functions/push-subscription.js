const {
  canManageMember,
  json,
  memberFromAuthHeader,
  parseBody,
  serviceClient
} = require("./_supabase");

function cleanText(value) {
  return String(value || "").trim();
}

async function findTargetMember(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,display_name,role")
    .eq("family_id", actor.family_id);
  if (body.profileKey) {
    query = query.eq("profile_key", cleanText(body.profileKey).toLowerCase());
  } else {
    query = query.eq("id", body.memberId || actor.id);
  }
  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

function subscriptionParts(subscription) {
  return {
    endpoint: cleanText(subscription?.endpoint),
    p256dh: cleanText(subscription?.keys?.p256dh),
    auth: cleanText(subscription?.keys?.auth)
  };
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const supabase = serviceClient();
  const target = await findTargetMember(supabase, actor, body);
  if (!canManageMember(actor, target)) {
    return json(403, { error: "You can manage only your own push subscription unless you are Brigham or Karmel." });
  }

  if (event.httpMethod === "DELETE") {
    const endpoint = cleanText(body.endpoint);
    if (!endpoint) return json(400, { error: "Send the subscription endpoint to remove." });
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .eq("member_id", target.id)
      .eq("endpoint", endpoint);
    if (error) return json(500, { error: error.message });
    return json(200, { removed: true });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const parts = subscriptionParts(body.subscription);
  if (!parts.endpoint || !parts.p256dh || !parts.auth) {
    return json(400, { error: "Send a valid browser PushSubscription with endpoint and keys." });
  }

  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert({
      family_id: actor.family_id,
      member_id: target.id,
      endpoint: parts.endpoint,
      p256dh: parts.p256dh,
      auth: parts.auth,
      user_agent: cleanText(body.userAgent),
      enabled: true,
      updated_at: new Date().toISOString()
    }, { onConflict: "member_id,endpoint" })
    .select("id,member_id,endpoint,enabled,updated_at")
    .single();

  if (error) return json(500, { error: error.message });

  await supabase.from("notification_preferences").upsert({
    family_id: actor.family_id,
    member_id: target.id,
    push_enabled: true,
    updated_at: new Date().toISOString()
  }, { onConflict: "member_id" });

  return json(200, { subscription: data });
};
