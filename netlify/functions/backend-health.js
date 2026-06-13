const { json, serviceClient } = require("./_supabase");

const expectedMembers = [
  { profileKey: "karmel", role: "admin" },
  { profileKey: "brigham", role: "admin" },
  { profileKey: "vanessa", role: "helper" },
  { profileKey: "thayne", role: "child" },
  { profileKey: "brig", role: "child" },
  { profileKey: "josh", role: "child" },
  { profileKey: "jojo", role: "child" },
  { profileKey: "louis", role: "child" },
  { profileKey: "brielle", role: "child" }
];

function envReady(name) {
  return Boolean(process.env[name]);
}

function checkEnv() {
  return {
    supabaseUrl: envReady("SUPABASE_URL"),
    supabaseAnonKey: envReady("SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: envReady("SUPABASE_SERVICE_ROLE_KEY"),
    googleClientId: envReady("GOOGLE_CLIENT_ID"),
    twilioAccountSid: envReady("TWILIO_ACCOUNT_SID"),
    twilioAuthToken: envReady("TWILIO_AUTH_TOKEN"),
    twilioMessagingServiceSid: envReady("TWILIO_MESSAGING_SERVICE_SID"),
    webPushVapidPublicKey: envReady("WEB_PUSH_VAPID_PUBLIC_KEY"),
    webPushVapidPrivateKey: envReady("WEB_PUSH_VAPID_PRIVATE_KEY"),
    karmelNoonReviewPhone: envReady("KARMEL_NOON_REVIEW_PHONE"),
    brighamExtensionPhone: envReady("BRIGHAM_EXTENSION_PHONE")
  };
}

function boolsReady(record, keys) {
  return keys.every(key => Boolean(record[key]));
}

function memberSummary(members = []) {
  return expectedMembers.map(expected => {
    const found = members.find(member => member.profile_key === expected.profileKey);
    return {
      profileKey: expected.profileKey,
      expectedRole: expected.role,
      present: Boolean(found),
      roleOk: found?.role === expected.role,
      gmailLinked: Boolean(found?.gmail),
      authLinked: Boolean(found?.auth_user_id)
    };
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const env = checkEnv();
  const checks = {
    env,
    database: { ok: false, message: "Supabase service role environment is not configured." },
    members: [],
    storage: { ok: false, message: "Supabase Storage has not been checked." },
    notifications: { ok: false, message: "Notification table has not been checked." },
    reminderPreferences: { ok: false, message: "Teen reminder preferences have not been checked." },
    push: {
      ok: boolsReady(env, ["webPushVapidPublicKey", "webPushVapidPrivateKey"]),
      message: "Web Push VAPID keys must be configured."
    },
    adminConfig: { ok: false, message: "Family settings and chore library have not been checked." },
    choreRecords: { ok: false, message: "Chore record table has not been checked." },
    money: { ok: false, message: "Money ledger table has not been checked." },
    sms: {
      ok: boolsReady(env, ["twilioAccountSid", "twilioAuthToken", "twilioMessagingServiceSid", "karmelNoonReviewPhone", "brighamExtensionPhone"]),
      message: "Twilio credentials and family text contacts must all be configured."
    },
    google: {
      ok: env.googleClientId,
      message: env.googleClientId ? "Google OAuth client ID is configured." : "Google OAuth client ID is missing."
    }
  };

  if (boolsReady(env, ["supabaseUrl", "supabaseServiceRoleKey"])) {
    try {
      const supabase = serviceClient();
      const { data: familyRows, error: familyError } = await supabase
        .from("families")
        .select("id,name", { count: "exact" })
        .limit(3);
      if (familyError) throw familyError;
      checks.database = {
        ok: true,
        familyCount: familyRows?.length || 0,
        message: "Supabase tables are reachable."
      };

      const { data: members, error: memberError } = await supabase
        .from("family_members")
        .select("profile_key,display_name,role,gmail,auth_user_id")
        .limit(50);
      if (memberError) throw memberError;
      checks.members = memberSummary(members);

      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      if (bucketError) throw bucketError;
      const hasPhotoBucket = (buckets || []).some(bucket => bucket.name === "family-photos");
      checks.storage = {
        ok: hasPhotoBucket,
        message: hasPhotoBucket ? "family-photos bucket exists." : "Create a private Supabase Storage bucket named family-photos."
      };

      const { error: notificationError } = await supabase
        .from("notification_log")
        .select("id")
        .limit(1);
      checks.notifications = {
        ok: !notificationError,
        message: notificationError ? notificationError.message : "Notification log table is reachable."
      };

      const { error: preferenceError } = await supabase
        .from("notification_preferences")
        .select("member_id,sms_enabled,notify_redo,notify_teen_reminders")
        .limit(1);
      const { error: pushSubscriptionError } = await supabase
        .from("push_subscriptions")
        .select("id,member_id,enabled")
        .limit(1);
      checks.reminderPreferences = {
        ok: !preferenceError && !pushSubscriptionError,
        message: preferenceError?.message || pushSubscriptionError?.message || "Teen reminder preference and push subscription rows are reachable."
      };

      const { error: familySettingsError } = await supabase
        .from("family_settings")
        .select("family_id")
        .limit(1);
      const { error: choresError } = await supabase
        .from("chores")
        .select("id")
        .limit(1);
      checks.adminConfig = {
        ok: !familySettingsError && !choresError,
        message: familySettingsError?.message || choresError?.message || "Family settings and chore library tables are reachable."
      };

      const { error: choreRecordError } = await supabase
        .from("chore_records")
        .select("id")
        .limit(1);
      checks.choreRecords = {
        ok: !choreRecordError,
        message: choreRecordError ? choreRecordError.message : "Chore record table is reachable."
      };

      const { error: moneyError } = await supabase
        .from("ledger_entries")
        .select("id")
        .limit(1);
      checks.money = {
        ok: !moneyError,
        message: moneyError ? moneyError.message : "Money ledger table is reachable."
      };
    } catch (error) {
      checks.database = {
        ok: false,
        message: error.message
      };
    }
  }

  const membersPresent = checks.members.length > 0 && checks.members.every(member => member.present && member.roleOk);
  const authLinked = checks.members.length > 0 && checks.members.every(member => member.authLinked);
  const gmailLinked = checks.members.length > 0 && checks.members.every(member => member.gmailLinked);
  const envOk = boolsReady(env, Object.keys(env));
  const ready = Boolean(envOk && checks.database.ok && checks.storage.ok && checks.notifications.ok && checks.reminderPreferences.ok && checks.push.ok && checks.adminConfig.ok && checks.choreRecords.ok && checks.money.ok && checks.sms.ok && checks.google.ok && membersPresent && authLinked && gmailLinked);

  return json(200, {
    ready,
    readyForWorkflowBeta: ready,
    generatedAt: new Date().toISOString(),
    checks,
    nextSteps: ready ? [] : [
      !envOk ? "Add all Supabase, Google, Twilio, and family phone environment variables in Netlify." : "",
      !checks.database.ok ? "Apply supabase/schema.sql and confirm Supabase service-role access." : "",
      !checks.reminderPreferences.ok ? "Confirm notification_preferences and push_subscriptions exist so teen reminder, redo text, and push opt-ins can be enforced." : "",
      !checks.push.ok ? "Configure Web Push VAPID public and private keys." : "",
      !checks.adminConfig.ok ? "Confirm family_settings and chores exist so parent admin rules and chore library edits save server-side." : "",
      !checks.choreRecords.ok ? "Confirm chore_records exists so completion, proof, approval, and redo records can be saved server-side." : "",
      !checks.money.ok ? "Confirm ledger_entries exists so fines, bonuses, and paid-fine records can be saved server-side." : "",
      !membersPresent ? "Seed all expected family member records with the correct roles." : "",
      !gmailLinked ? "Add Gmail addresses to every family member record." : "",
      !authLinked ? "Have every family member sign in once with Google so auth_user_id is linked." : "",
      !checks.storage.ok ? "Create the private family-photos Supabase Storage bucket." : "",
      !checks.sms.ok ? "Configure Twilio credentials, messaging service SID, Karmel review phone, and Brigham extension phone." : ""
    ].filter(Boolean)
  });
};
