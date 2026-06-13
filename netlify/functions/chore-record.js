const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const allowedTypes = new Set(["priority", "rotating"]);
const allowedActions = new Set(["complete", "reopen", "approve", "redo", "ensure"]);

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function cleanDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function dateOffset(offset = 0) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

async function signedPhotoUrl(supabase, storagePath) {
  if (!storagePath) return "";
  const { data, error } = await supabase.storage
    .from("family-photos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

async function publicChoreRecord(supabase, record, child) {
  return {
    id: record.id,
    childId: record.child_id,
    childProfileKey: child?.profile_key || "",
    childName: child?.display_name || "",
    choreId: record.chore_id,
    choreName: record.chore_name,
    choreType: record.chore_type,
    serviceDate: record.service_date,
    completedAt: record.completed_at,
    proofPhotoPath: record.proof_photo_path,
    proofPhotoUrl: await signedPhotoUrl(supabase, record.proof_photo_path),
    proofSubmittedAt: record.proof_submitted_at,
    reviewStatus: record.review_status,
    reviewedBy: record.reviewed_by,
    reviewedAt: record.reviewed_at,
    redoNote: record.redo_note
  };
}

async function findChild(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name,role")
    .eq("family_id", actor.family_id)
    .eq("role", "child");

  if (body.childProfileKey) {
    query = query.eq("profile_key", cleanText(body.childProfileKey).toLowerCase());
  } else {
    query = query.eq("id", body.childId || actor.id);
  }

  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

async function choreIdForName(supabase, actor, choreName) {
  const { data } = await supabase
    .from("chores")
    .select("id")
    .eq("family_id", actor.family_id)
    .ilike("name", choreName)
    .maybeSingle();
  return data?.id || null;
}

async function existingRecord(supabase, actor, child, body) {
  const serviceDate = cleanDate(body.serviceDate);
  const choreType = cleanText(body.choreType);
  const choreName = cleanText(body.choreName);
  if (!serviceDate || !allowedTypes.has(choreType) || !choreName) return { error: "Send serviceDate, choreType, and choreName." };

  const { data, error } = await supabase
    .from("chore_records")
    .select("*")
    .eq("family_id", actor.family_id)
    .eq("child_id", child.id)
    .eq("service_date", serviceDate)
    .eq("chore_type", choreType)
    .eq("chore_name", choreName)
    .maybeSingle();

  if (error) return { error: error.message };
  return { record: data || null, serviceDate, choreType, choreName };
}

async function ensureRecord(supabase, actor, child, body) {
  const lookup = await existingRecord(supabase, actor, child, body);
  if (lookup.error) return { error: lookup.error };
  if (lookup.record) return { record: lookup.record };

  const choreId = lookup.choreType === "rotating"
    ? await choreIdForName(supabase, actor, lookup.choreName)
    : null;

  const { data, error } = await supabase
    .from("chore_records")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      chore_id: choreId,
      chore_name: lookup.choreName,
      chore_type: lookup.choreType,
      service_date: lookup.serviceDate,
      review_status: "waiting"
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { record: data };
}

function canManageChildTask(actor, child) {
  return requireAdmin(actor) || actor.id === child.id;
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();

  if (event.httpMethod === "GET") {
    const startDate = cleanDate(event.queryStringParameters?.startDate) || dateOffset(-7);
    const endDate = cleanDate(event.queryStringParameters?.endDate) || dateOffset(7);
    const { data, error } = await supabase
      .from("chore_records")
      .select("*, family_members!chore_records_child_id_fkey(profile_key,display_name)")
      .eq("family_id", actor.family_id)
      .gte("service_date", startDate)
      .lte("service_date", endDate)
      .order("service_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return json(500, { error: error.message });
    const choreRecords = await Promise.all((data || []).map(record => publicChoreRecord(supabase, record, record.family_members)));
    return json(200, { choreRecords });
  }

  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const action = cleanText(body.action);
  if (!allowedActions.has(action)) return json(400, { error: "Use action complete, reopen, approve, redo, or ensure." });

  const child = await findChild(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for this family." });

  if ((action === "complete" || action === "reopen" || action === "ensure") && !canManageChildTask(actor, child)) {
    return json(403, { error: "Children can update only their own chore records unless Brigham or Karmel is signed in." });
  }
  if ((action === "approve" || action === "redo") && !requireAdmin(actor)) {
    return json(403, { error: "Only Brigham or Karmel can approve chores or send them back for redo." });
  }

  const ensured = await ensureRecord(supabase, actor, child, body);
  if (ensured.error) return json(400, { error: ensured.error });
  const record = ensured.record;

  let updates = {};
  if (action === "complete") {
    updates = {
      completed_at: record.completed_at || new Date().toISOString(),
      review_status: record.review_status === "approved" ? "approved" : "waiting",
      redo_note: null
    };
  }
  if (action === "reopen") {
    if (record.review_status === "approved") return json(409, { error: "Approved chores cannot be reopened by the child." });
    updates = {
      completed_at: null,
      proof_photo_path: null,
      proof_submitted_at: null,
      review_status: "waiting",
      redo_note: null
    };
  }
  if (action === "approve") {
    if (!record.completed_at) return json(409, { error: "A chore must be marked complete before approval." });
    updates = {
      review_status: "approved",
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
      redo_note: null
    };
  }
  if (action === "redo") {
    updates = {
      completed_at: null,
      review_status: "redo",
      reviewed_by: actor.id,
      reviewed_at: new Date().toISOString(),
      redo_note: cleanText(body.redoNote, "Redo requested after inspection.")
    };
  }

  if (action === "ensure") {
    return json(200, { choreRecord: record, child: { id: child.id, profileKey: child.profile_key, displayName: child.display_name } });
  }

  const { data: updated, error } = await supabase
    .from("chore_records")
    .update(updates)
    .eq("id", record.id)
    .select("*")
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { choreRecord: updated, child: { id: child.id, profileKey: child.profile_key, displayName: child.display_name } });
};
