const { json, memberFromAuthHeader, serviceClient } = require("./_supabase");

async function signedPhotoUrl(supabase, storagePath) {
  if (!storagePath) return "";
  const { data, error } = await supabase.storage
    .from("family-photos")
    .createSignedUrl(storagePath, 60 * 60);
  if (error) return "";
  return data?.signedUrl || "";
}

function publicMember(member, signedProfileUrl = "") {
  return {
    id: member.id,
    profileKey: member.profile_key,
    displayName: member.display_name,
    role: member.role,
    age: member.age,
    cellPhone: member.cell_phone || "",
    textRemindersEnabled: Boolean(member.text_reminders_enabled),
    profilePhotoPath: member.profile_photo_path || "",
    profilePhotoUrl: signedProfileUrl,
    maxDifficulty: member.max_difficulty,
    targetHard: Boolean(member.target_hard),
    dailyWorkTargetMinutes: member.daily_work_target_minutes,
    fineRate: Number(member.fine_rate || 0),
    accountBalance: Number(member.account_balance || 0)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });

  const supabase = serviceClient();
  const { data: family, error: familyError } = await supabase
    .from("families")
    .select("id,name,hero_photo_path")
    .eq("id", actor.family_id)
    .single();
  if (familyError) return json(500, { error: familyError.message });

  const { data: members, error: memberError } = await supabase
    .from("family_members")
    .select("id,profile_key,display_name,role,age,cell_phone,text_reminders_enabled,profile_photo_path,max_difficulty,target_hard,daily_work_target_minutes,fine_rate,account_balance")
    .eq("family_id", actor.family_id)
    .order("role", { ascending: true })
    .order("age", { ascending: false });
  if (memberError) return json(500, { error: memberError.message });

  const profileUrls = new Map();
  await Promise.all((members || []).map(async (member) => {
    if (!member.profile_photo_path) return;
    profileUrls.set(member.id, await signedPhotoUrl(supabase, member.profile_photo_path));
  }));

  return json(200, {
    family: {
      id: family.id,
      name: family.name,
      heroPhotoPath: family.hero_photo_path || "",
      heroPhotoUrl: await signedPhotoUrl(supabase, family.hero_photo_path)
    },
    members: (members || []).map(member => publicMember(member, profileUrls.get(member.id) || ""))
  });
};
