const { json, serviceClient } = require("./_supabase");

function bearerToken(event) {
  const authHeader = event.headers.authorization || event.headers.Authorization || "";
  return authHeader.replace(/^Bearer\s+/i, "");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const token = bearerToken(event);
  if (!token) return json(401, { error: "Google session token required." });

  const supabase = serviceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  const email = String(user?.email || "").trim().toLowerCase();
  if (userError || !user || !email) {
    return json(401, { error: "Google session could not be verified." });
  }

  const { data: member, error: memberError } = await supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name,role,gmail,auth_user_id,text_reminders_enabled")
    .ilike("gmail", email)
    .single();

  if (memberError || !member) {
    return json(403, { error: `${email} is not invited to Teamwork Chores yet. Add this Gmail to the matching family member record first.` });
  }

  if (member.auth_user_id && member.auth_user_id !== user.id) {
    return json(403, { error: `${member.display_name}'s Gmail is already linked to a different Google account.` });
  }

  let linkedMember = member;
  if (!member.auth_user_id) {
    const { data: updated, error: updateError } = await supabase
      .from("family_members")
      .update({
        auth_user_id: user.id,
        updated_at: new Date().toISOString()
      })
      .eq("id", member.id)
      .select("id,family_id,profile_key,display_name,role,gmail,auth_user_id,text_reminders_enabled")
      .single();
    if (updateError) return json(500, { error: updateError.message });
    linkedMember = updated;
  }

  return json(200, {
    member: {
      id: linkedMember.id,
      profileKey: linkedMember.profile_key,
      displayName: linkedMember.display_name,
      role: linkedMember.role,
      gmail: linkedMember.gmail,
      authLinked: Boolean(linkedMember.auth_user_id),
      textRemindersEnabled: linkedMember.text_reminders_enabled
    }
  });
};
