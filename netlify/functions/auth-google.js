const { json, memberFromAuthHeader } = require("./_supabase");

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });
  const member = await memberFromAuthHeader(event);
  if (!member) return json(401, { error: "Google session is not linked to a Teamwork Chores family member." });
  return json(200, {
    member: {
      id: member.id,
      profileKey: member.profile_key,
      displayName: member.display_name,
      role: member.role,
      textRemindersEnabled: member.text_reminders_enabled
    }
  });
};
