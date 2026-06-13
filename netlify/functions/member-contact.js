const {
  canManageMember,
  json,
  memberFromAuthHeader,
  normalizeUsPhone,
  parseBody,
  serviceClient
} = require("./_supabase");

async function findTargetMember(supabase, actor, targetMemberId) {
  const id = targetMemberId || actor.id;
  const { data, error } = await supabase
    .from("family_members")
    .select("id,family_id,display_name,role,cell_phone,text_reminders_enabled")
    .eq("id", id)
    .single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

exports.handler = async (event) => {
  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();
  const targetMemberId = event.queryStringParameters?.memberId;
  const target = await findTargetMember(supabase, actor, targetMemberId);
  if (!canManageMember(actor, target)) return json(403, { error: "You can update only your own phone settings unless you are Brigham or Karmel." });

  if (event.httpMethod === "GET") {
    return json(200, {
      member: {
        id: target.id,
        displayName: target.display_name,
        cellPhone: target.cell_phone || "",
        textRemindersEnabled: Boolean(target.text_reminders_enabled)
      }
    });
  }

  if (event.httpMethod !== "PATCH") return json(405, { error: "Method not allowed" });
  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });

  const cellPhone = normalizeUsPhone(body.cellPhone);
  const textRemindersEnabled = Boolean(body.textRemindersEnabled);
  if (textRemindersEnabled && cellPhone.length !== 10) {
    return json(400, { error: "Add a 10-digit cell phone number before turning on text reminders." });
  }
  if (cellPhone && cellPhone.length !== 10) {
    return json(400, { error: "Use a 10-digit cell phone number." });
  }

  const nextPhone = cellPhone || null;
  const nextReminderState = textRemindersEnabled && Boolean(nextPhone);
  const { data: updated, error } = await supabase
    .from("family_members")
    .update({
      cell_phone: nextPhone,
      text_reminders_enabled: nextReminderState,
      updated_at: new Date().toISOString()
    })
    .eq("id", target.id)
    .select("id,display_name,cell_phone,text_reminders_enabled")
    .single();

  if (error) return json(500, { error: error.message });

  await supabase.from("notification_preferences").upsert({
    family_id: actor.family_id,
    member_id: target.id,
    cell_phone: nextPhone,
    sms_enabled: nextReminderState,
    notify_extensions: nextReminderState,
    notify_redo: nextReminderState,
    notify_teen_reminders: nextReminderState,
    updated_at: new Date().toISOString()
  }, { onConflict: "member_id" });

  return json(200, {
    member: {
      id: updated.id,
      displayName: updated.display_name,
      cellPhone: updated.cell_phone || "",
      textRemindersEnabled: Boolean(updated.text_reminders_enabled)
    }
  });
};
