const { json, memberFromAuthHeader, serviceClient } = require("./_supabase");
const { randomUUID } = require("node:crypto");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const member = await memberFromAuthHeader(event);
  if (!member) return json(401, { error: "Sign in required." });

  const body = JSON.parse(event.body || "{}");
  const kind = body.kind || "proof";
  const extension = String(body.extension || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const storagePath = `family/${member.family_id}/${kind}/${randomUUID()}.${extension}`;
  const supabase = serviceClient();
  const { data, error } = await supabase.storage
    .from("family-photos")
    .createSignedUploadUrl(storagePath);

  if (error) return json(500, { error: error.message });
  return json(200, { storagePath, signedUrl: data.signedUrl, token: data.token });
};
