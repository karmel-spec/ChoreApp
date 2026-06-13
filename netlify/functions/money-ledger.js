const {
  json,
  memberFromAuthHeader,
  parseBody,
  requireAdmin,
  serviceClient
} = require("./_supabase");

const MONEY_CONFIRMATION = "CONFIRM MONEY";

function moneyAmount(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}

function cleanText(value, fallback = "") {
  return String(value || fallback).trim().replace(/\s+/g, " ");
}

function serviceDate(value) {
  const text = cleanText(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function requireMoneyConfirmation(body) {
  return cleanText(body.confirmationText).toUpperCase() === MONEY_CONFIRMATION;
}

async function findChild(supabase, actor, body) {
  let query = supabase
    .from("family_members")
    .select("id,family_id,profile_key,display_name,role,account_balance")
    .eq("family_id", actor.family_id)
    .eq("role", "child");

  if (body.childProfileKey) {
    query = query.eq("profile_key", cleanText(body.childProfileKey).toLowerCase());
  } else {
    query = query.eq("id", body.childId || "");
  }

  const { data, error } = await query.single();
  if (error || !data || data.family_id !== actor.family_id) return null;
  return data;
}

async function chargeFine({ supabase, actor, body }) {
  const child = await findChild(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for this family." });

  const amount = moneyAmount(body.amount);
  const title = cleanText(body.title, "Missed deadline fine");
  const date = serviceDate(body.serviceDate);
  if (!amount || amount <= 0 || amount > 1000 || !date) {
    return json(400, { error: "Send a positive fine amount and serviceDate like 2026-06-13." });
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("ledger_entries")
    .select("id,title,amount,paid,created_at")
    .eq("family_id", actor.family_id)
    .eq("child_id", child.id)
    .eq("kind", "fine")
    .eq("title", title)
    .eq("service_date", date)
    .maybeSingle();

  if (duplicateError) return json(500, { error: duplicateError.message });
  if (duplicate) {
    return json(409, {
      error: "This fine already exists for that child and service date.",
      ledgerEntry: duplicate
    });
  }

  const { data: entry, error } = await supabase
    .from("ledger_entries")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      kind: "fine",
      title,
      amount,
      service_date: date,
      paid: false,
      charged_by: actor.id,
      charged_at: new Date().toISOString(),
      metadata: {
        deadline: cleanText(body.deadline),
        reason: cleanText(body.reason),
        source: "money-ledger"
      }
    })
    .select("id,kind,title,amount,service_date,paid,charged_by,charged_at,metadata")
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { ledgerEntry: entry, child: { id: child.id, profileKey: child.profile_key, displayName: child.display_name } });
}

async function awardBonus({ supabase, actor, body }) {
  const child = await findChild(supabase, actor, body);
  if (!child) return json(404, { error: "Child profile not found for this family." });

  const amount = moneyAmount(body.amount);
  const title = cleanText(body.title, "Chore bonus");
  const period = cleanText(body.period);
  if (!amount || amount <= 0 || amount > 10000 || !period) {
    return json(400, { error: "Send a positive bonus amount and a bonus period." });
  }

  const { data: duplicate, error: duplicateError } = await supabase
    .from("ledger_entries")
    .select("id,title,amount,paid,created_at")
    .eq("family_id", actor.family_id)
    .eq("child_id", child.id)
    .eq("kind", "bonus")
    .eq("title", title)
    .eq("period", period)
    .maybeSingle();

  if (duplicateError) return json(500, { error: duplicateError.message });
  if (duplicate) {
    return json(409, {
      error: "This bonus already exists for that child and bonus period.",
      ledgerEntry: duplicate
    });
  }

  const nextBalance = moneyAmount(Number(child.account_balance || 0) + amount);
  const { data: entry, error } = await supabase
    .from("ledger_entries")
    .insert({
      family_id: actor.family_id,
      child_id: child.id,
      kind: "bonus",
      title,
      amount,
      period,
      paid: true,
      awarded_by: actor.id,
      awarded_at: new Date().toISOString(),
      metadata: {
        days: Number(body.days || 0) || null,
        bonusType: cleanText(body.bonusType),
        points: Number(body.points || 0) || null,
        rank: Number(body.rank || 0) || null,
        source: "money-ledger"
      }
    })
    .select("id,kind,title,amount,period,paid,awarded_by,awarded_at,metadata")
    .single();

  if (error) return json(500, { error: error.message });

  const { data: updatedChild, error: balanceError } = await supabase
    .from("family_members")
    .update({ account_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq("id", child.id)
    .select("id,profile_key,display_name,account_balance")
    .single();

  if (balanceError) {
    await supabase.from("ledger_entries").delete().eq("id", entry.id);
    return json(500, { error: balanceError.message });
  }
  return json(200, { ledgerEntry: entry, child: updatedChild });
}

async function markFinePaid({ supabase, actor, body }) {
  const ledgerEntryId = cleanText(body.ledgerEntryId);
  if (!ledgerEntryId) return json(400, { error: "Send a ledgerEntryId for the fine being paid." });

  const { data: entry, error: entryError } = await supabase
    .from("ledger_entries")
    .select("id,family_id,child_id,kind,title,amount,paid,service_date")
    .eq("id", ledgerEntryId)
    .single();

  if (entryError || !entry || entry.family_id !== actor.family_id || entry.kind !== "fine") {
    return json(404, { error: "Fine ledger entry not found for this family." });
  }
  if (entry.paid) return json(409, { error: "This fine is already marked paid.", ledgerEntry: entry });

  const { data: updated, error } = await supabase
    .from("ledger_entries")
    .update({
      paid: true,
      paid_by: actor.id,
      paid_at: new Date().toISOString()
    })
    .eq("id", entry.id)
    .select("id,kind,title,amount,service_date,paid,paid_by,paid_at")
    .single();

  if (error) return json(500, { error: error.message });
  return json(200, { ledgerEntry: updated });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const actor = await memberFromAuthHeader(event);
  if (!actor) return json(401, { error: "Sign in required." });
  if (!requireAdmin(actor)) return json(403, { error: "Only Brigham or Karmel can change money ledger records." });

  const body = parseBody(event);
  if (!body) return json(400, { error: "Invalid JSON body." });
  if (!requireMoneyConfirmation(body)) {
    return json(400, { error: `Type ${MONEY_CONFIRMATION} before changing money records.` });
  }

  const supabase = serviceClient();
  const action = cleanText(body.action);
  if (action === "charge_fine") return chargeFine({ supabase, actor, body });
  if (action === "award_bonus") return awardBonus({ supabase, actor, body });
  if (action === "mark_fine_paid") return markFinePaid({ supabase, actor, body });

  return json(400, { error: "Use action charge_fine, award_bonus, or mark_fine_paid." });
};
