const {
  canManageMember,
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const allowedKinds = new Set(["family_hero", "profile", "proof", "feed"]);

async function findProfileTarget(supabase, actor, body) {
  let targetQuery = supabase
    .from("family_members")
    .select("id,family_id,display_name")
    .eq("family_id", actor.family_id);
  if (body.profileKey) {
    targetQuery = targetQuery.eq("profile_key", body.profileKey);
  } else {
    targetQuery = targetQuery.eq("id", body.memberId || actor.id);
  }
  const { data: target, error } = await targetQuery.single();
  if (error || !target || target.family_id !== actor.family_id) return null;
  return target;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });
  const kind = body.kind;
  const action = body.action === "clear" ? "clear" : "record";
  const storagePath = String(body.storagePath || "").trim();
  if (!allowedKinds.has(kind) || (action !== "clear" && !storagePath)) {
    return json(400, { error: "Send a supported photo kind and storage path." });
  }
  if (storagePath && !storagePath.startsWith(`family/${actor.family_id}/`)) {
    return json(403, { error: "Photo path must belong to your family." });
  }

  const supabase = serviceClient();
  let memberId = null;
  let choreRecordId = null;

  if (action === "clear") {
    if (kind === "family_hero") {
      if (!requireAdmin(actor)) return json(403, { error: "Only parent admins can clear the family hero photo." });
      const { error } = await supabase
        .from("families")
        .update({ hero_photo_path: null })
        .eq("id", actor.family_id);
      if (error) return json(500, { error: error.message });
      return json(200, { cleared: true, kind });
    }
    if (kind === "profile") {
      const target = await findProfileTarget(supabase, actor, body);
      if (!target) return json(404, { error: "Profile member not found." });
      if (!canManageMember(actor, target)) {
        return json(403, { error: "You can clear only your own profile photo unless you are Brigham or Karmel." });
      }
      const { error } = await supabase
        .from("family_members")
        .update({ profile_photo_path: null, updated_at: new Date().toISOString() })
        .eq("id", target.id);
      if (error) return json(500, { error: error.message });
      return json(200, { cleared: true, kind, memberId: target.id });
    }
    return json(400, { error: "Only family hero and profile photos can be cleared." });
  }

  if (kind === "family_hero") {
    if (!requireAdmin(actor)) return json(403, { error: "Only parent admins can change the family hero photo." });
    const { error } = await supabase
      .from("families")
      .update({ hero_photo_path: storagePath })
      .eq("id", actor.family_id);
    if (error) return json(500, { error: error.message });
  }

  if (kind === "profile") {
    const target = await findProfileTarget(supabase, actor, body);
    if (!target) return json(404, { error: "Profile member not found." });
    if (!canManageMember(actor, target)) {
      return json(403, { error: "You can update only your own profile photo unless you are Brigham or Karmel." });
    }
    memberId = target.id;
    const { error } = await supabase
      .from("family_members")
      .update({ profile_photo_path: storagePath, updated_at: new Date().toISOString() })
      .eq("id", target.id);
    if (error) return json(500, { error: error.message });
  }

  if (kind === "proof") {
    choreRecordId = body.choreRecordId;
    if (!choreRecordId) return json(400, { error: "Proof photos require a choreRecordId." });
    const { data: record, error: recordError } = await supabase
      .from("chore_records")
      .select("id,family_id,child_id")
      .eq("id", choreRecordId)
      .single();
    if (recordError || !record || record.family_id !== actor.family_id) {
      return json(404, { error: "Chore record not found." });
    }
    if (!requireAdmin(actor) && actor.id !== record.child_id) {
      return json(403, { error: "Children can upload proof photos only for their own chores." });
    }
    memberId = record.child_id;
    const { error } = await supabase
      .from("chore_records")
      .update({ proof_photo_path: storagePath, proof_submitted_at: new Date().toISOString() })
      .eq("id", record.id);
    if (error) return json(500, { error: error.message });
  }

  if (kind === "feed") {
    memberId = body.memberId || actor.id;
    if (!requireAdmin(actor) && memberId !== actor.id) {
      return json(403, { error: "Family feed photos must be posted by the signed-in member or a parent admin." });
    }
  }

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .insert({
      family_id: actor.family_id,
      member_id: memberId,
      chore_record_id: choreRecordId,
      kind,
      storage_path: storagePath,
      caption: body.caption || null,
      created_by: actor.id
    })
    .select("id,kind,storage_path,created_at")
    .single();

  if (photoError) return json(500, { error: photoError.message });
  return json(200, { photo });
};
