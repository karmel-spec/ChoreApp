import { access, readFile } from "node:fs/promises";

function extractInlineScripts(html) {
  return Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g)).map(match => match[1]);
}

function extractStaticIds(html) {
  return Array.from(html.matchAll(/\sid="([^"]+)"/g))
    .map(match => match[1])
    .filter(id => !id.includes("${"));
}

function assertUniqueIds(html, file) {
  const ids = extractStaticIds(html);
  const seen = new Set();
  const duplicates = new Set();
  ids.forEach(id => {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  });
  if (duplicates.size) {
    throw new Error(`${file} has duplicate ids: ${Array.from(duplicates).join(", ")}`);
  }
}

function assertScriptParses(html, file) {
  extractInlineScripts(html).forEach((script, index) => {
    try {
      new Function(script);
    } catch (error) {
      throw new Error(`${file} inline script ${index + 1} does not parse: ${error.message}`);
    }
  });
}

const requiredFiles = [
  ".env.example",
  ".github/workflows/deploy-netlify.yml",
  "docs/backend-setup.md",
  "netlify/functions/_supabase.js",
  "netlify/functions/auth-google.js",
  "netlify/functions/availability-hold.js",
  "netlify/functions/backend-health.js",
  "netlify/functions/chore-feedback.js",
  "netlify/functions/chore-record.js",
  "netlify/functions/chore-library.js",
  "netlify/functions/extension-decision.js",
  "netlify/functions/extension-request.js",
  "netlify/functions/family-snapshot.js",
  "netlify/functions/family-settings.js",
  "netlify/functions/helper-time.js",
  "netlify/functions/helper-workspace.js",
  "netlify/functions/link-google-member.js",
  "netlify/functions/member-contact.js",
  "netlify/functions/member-rules.js",
  "netlify/functions/money-ledger.js",
  "netlify/functions/notification-log.js",
  "netlify/functions/photo-record.js",
  "netlify/functions/photo-upload-url.js",
  "netlify/functions/push-subscription.js",
  "netlify/functions/runtime-config.js",
  "netlify/functions/scheduled-noon-review.js",
  "netlify/functions/scheduled-teen-reminders.js",
  "netlify/functions/send-sms.js",
  "netlify/functions/send-push.js",
  "netlify/functions/teen-reminder.js",
  "outputs/index.html",
  "outputs/family-chore-dashboard-prototype.html",
  "outputs/chore-app-designs.html",
  "outputs/chore-app-phase-plan.md",
  "outputs/beta-testing-guide.md",
  "outputs/beta-testing-guide.html",
  "outputs/manifest.webmanifest",
  "outputs/service-worker.js",
  "outputs/offline.html",
  "outputs/icons/teamwork-chores-icon.svg",
  "supabase/schema.sql",
  "supabase/seed-teamwork-chores.sql"
];

for (const file of requiredFiles) {
  await access(file);
}

const appHtml = await readFile("outputs/family-chore-dashboard-prototype.html", "utf8");
const homeHtml = await readFile("outputs/index.html", "utf8");
const betaGuide = await readFile("outputs/beta-testing-guide.md", "utf8");
const betaGuideHtml = await readFile("outputs/beta-testing-guide.html", "utf8");
const phasePlan = await readFile("outputs/chore-app-phase-plan.md", "utf8");
const netlifyConfig = await readFile("netlify.toml", "utf8");
const deployWorkflow = await readFile(".github/workflows/deploy-netlify.yml", "utf8");
const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const envExample = await readFile(".env.example", "utf8");
const backendSetup = await readFile("docs/backend-setup.md", "utf8");
const supabaseSchema = await readFile("supabase/schema.sql", "utf8");
const supabaseSeed = await readFile("supabase/seed-teamwork-chores.sql", "utf8");
const supabaseHelperFunction = await readFile("netlify/functions/_supabase.js", "utf8");
const authFunction = await readFile("netlify/functions/auth-google.js", "utf8");
const availabilityHoldFunction = await readFile("netlify/functions/availability-hold.js", "utf8");
const backendHealthFunction = await readFile("netlify/functions/backend-health.js", "utf8");
const choreFeedbackFunction = await readFile("netlify/functions/chore-feedback.js", "utf8");
const choreRecordFunction = await readFile("netlify/functions/chore-record.js", "utf8");
const choreLibraryFunction = await readFile("netlify/functions/chore-library.js", "utf8");
const extensionDecisionFunction = await readFile("netlify/functions/extension-decision.js", "utf8");
const extensionRequestFunction = await readFile("netlify/functions/extension-request.js", "utf8");
const familySnapshotFunction = await readFile("netlify/functions/family-snapshot.js", "utf8");
const familySettingsFunction = await readFile("netlify/functions/family-settings.js", "utf8");
const helperTimeFunction = await readFile("netlify/functions/helper-time.js", "utf8");
const helperWorkspaceFunction = await readFile("netlify/functions/helper-workspace.js", "utf8");
const linkGoogleFunction = await readFile("netlify/functions/link-google-member.js", "utf8");
const memberContactFunction = await readFile("netlify/functions/member-contact.js", "utf8");
const memberRulesFunction = await readFile("netlify/functions/member-rules.js", "utf8");
const moneyLedgerFunction = await readFile("netlify/functions/money-ledger.js", "utf8");
const notificationLogFunction = await readFile("netlify/functions/notification-log.js", "utf8");
const photoRecordFunction = await readFile("netlify/functions/photo-record.js", "utf8");
const photoFunction = await readFile("netlify/functions/photo-upload-url.js", "utf8");
const pushSubscriptionFunction = await readFile("netlify/functions/push-subscription.js", "utf8");
const runtimeConfigFunction = await readFile("netlify/functions/runtime-config.js", "utf8");
const scheduledNoonFunction = await readFile("netlify/functions/scheduled-noon-review.js", "utf8");
const scheduledTeenFunction = await readFile("netlify/functions/scheduled-teen-reminders.js", "utf8");
const smsFunction = await readFile("netlify/functions/send-sms.js", "utf8");
const pushFunction = await readFile("netlify/functions/send-push.js", "utf8");
const teenReminderFunction = await readFile("netlify/functions/teen-reminder.js", "utf8");
const manifest = JSON.parse(await readFile("outputs/manifest.webmanifest", "utf8"));
const serviceWorker = await readFile("outputs/service-worker.js", "utf8");
const expectedCacheName = "teamwork-chores-beta-2026-06-12";

assertUniqueIds(appHtml, "outputs/family-chore-dashboard-prototype.html");
assertUniqueIds(homeHtml, "outputs/index.html");
assertScriptParses(appHtml, "outputs/family-chore-dashboard-prototype.html");
assertScriptParses(homeHtml, "outputs/index.html");
assertScriptParses(betaGuideHtml, "outputs/beta-testing-guide.html");

const requiredMarkers = [
  "Teamwork Chores",
  "Mom's Helper",
  "Build Roadmap",
  "Grant Approved Extension",
  "isExtensionApprover",
  "extensionDeadlines",
  "extensionDeadlineKey",
  "extensionAuditLog",
  "renderExtensionAuditLog",
  "logExtensionAudit",
  "extension audit events",
  "No extension requests logged yet",
  "approvedDeadlineFor",
  "setApprovedDeadline",
  "clearApprovedDeadline",
  "normalizeClockTime",
  "Use a valid extension time like 1:30 PM or 13:30",
  "Only ${familySettings.extensionApprover} can approve extension petitions",
  "textExtensionBtn",
  "updateExtensionPetitionState",
  "Extension Request Locked",
  "can send ${child.name}'s extension petition",
  "extensionPetitionMessage",
  "extensionContactSmsNumber",
  "defaultReviewRecipient",
  "safeStoredNumber",
  "choreDifficulty",
  "normalizeBonusRules",
  "bonusRules = normalizeBonusRules",
  "normalizeChoreRecord",
  "data.choreLibrary.map(normalizeChoreRecord)",
  "Imported chore ${index + 1}",
  "minutes: Math.min(180, Math.max(1, minutes))",
  "difficulty: Math.min(10, Math.max(1, difficulty))",
  "normalizeChildLedgerSet",
  "normalizeLedgerRecord",
  "normalizedLedgerAmount",
  "cleanAuditText",
  "ledger = normalizeChildLedgerSet(data.ledger, \"fine\")",
  "bonusLedger = normalizeChildLedgerSet(data.bonusLedger, \"bonus\")",
  "normalized.chargedBy",
  "normalized.awardedBy",
  "Date not recorded",
  "normalizeHelperBoardTasks",
  "normalizeHelperTaskRecord",
  "helperBoardTasks = normalizeHelperBoardTasks(data.helperBoardTasks)",
  "Imported helper task ${index + 1}",
  "normalizeIngredientRequest",
  "ingredientRequests = data.ingredientRequests.map(normalizeIngredientRequest)",
  "Imported ingredient request ${index + 1}",
  "normalizeFineAssessments",
  "normalizeExtensionDeadlines",
  "normalizeExtensionAuditRecord",
  "normalizeReviewReminderRecord",
  "fineAssessments = normalizeFineAssessments(data.fineAssessments)",
  "extensionDeadlines = normalizeExtensionDeadlines(data.extensionDeadlines)",
  "extensionAuditLog = data.extensionAuditLog.map(normalizeExtensionAuditRecord).slice(0, 80)",
  "reviewReminderLog = data.reviewReminderLog.map(normalizeReviewReminderRecord).slice(0, 60)",
  "normalizeTimestamp",
  "normalizeFeedbackRecord",
  "feedbackCategories",
  "feedbackSeverities",
  "feedbackPeople",
  "betaFeedback = data.betaFeedback.map(normalizeFeedbackRecord).slice(0, 120)",
  "Imported feedback note ${index + 1}",
  "normalizeChoreState",
  "normalizeChoreStateRecord",
  "normalizeProofImage",
  "normalizeOptionalTimestamp",
  "localStorage.setItem(choreStateStoreKey, JSON.stringify(normalizeChoreState(validBackup.choreState || {})))",
  "[\"waiting\", \"approved\", \"redo\"].includes(recordData.reviewStatus)",
  "child.fineRate = safeStoredNumber",
  "child.accountBalance = safeStoredNumber",
  "801-427-9293",
  "Text Mom Karmel",
  "Mom Karmel",
  "reminder for ${familySettings.reviewRecipient}",
  "normalizeFamilyReviewContact",
  "normalizeFamilySettingsRecord",
  "familySettings = normalizeFamilySettingsRecord(data.familySettings)",
  "defaultDeadline: normalizeClockTime(merged.defaultDeadline)",
  "reviewReminderTime: normalizeClockTime(merged.reviewReminderTime)",
  "reviewContactSmsNumber",
  "tenDigitPhone",
  "noonReviewMessage",
  "clockTimeMinutes",
  "reviewReminderDueNow",
  "todayReviewReminderFor",
  "updateReviewCueState",
  "Review is due now",
  "Review Text Queued Today",
  "Parent Review Locked",
  "Only Brigham or Karmel can send the noon review text cue",
  "setInterval(updateReviewCueState, 30000)",
  "Use valid rule times like 12:00 PM or 13:30",
  "Use 10-digit text numbers for Dad extensions and Mom Karmel review reminders",
  "sms:${smsNumber}",
  "Continue with Google",
  "selectedLoginId = account.id",
  "enforceChildSessionScope",
  "currentUser?.role !== \"child\"",
  "selectedChildId = currentUser.childId",
  "All-Time Streak Podium",
  "Best overall lead for lifetime streaks",
  "All-time leader loading",
  "renderStreakPodium",
  "data-podium-child",
  "podiumLeadNote",
  "Leading by ${leaderGap} days",
  "escapeHtml",
  "No eligible rotating chores under ${getDailyMinuteTarget(child)} minutes",
  "dailyPositiveThought",
  "Make 10 layered salad jars",
  "ensureRequiredChoreSeeds",
  "trainingNotes",
  "deleteChore",
  "Backend Admin: Availability Holds",
  "activeHoldFor",
  "data-remove-hold-id",
  "removeAvailabilityHold",
  "Only Brigham or Karmel can remove availability holds",
  "No rotating chore fines accrue during this hold",
  "Muted: ${escapeHtml(hold.reason)}",
  "Muted for ${escapeHtml(hold.reason)}. No fines accrue.",
  "availability holds",
  "chore feedback suggestions",
  "family feed posts",
  "Excused: ${excusedChildren.join(\", \")}",
  "childWorkTargets",
  "renderFairnessTargets",
  "calculateFairnessRetrospective",
  "choreDetailsForRecord",
  "Past 30 days:",
  "sports seasons, illness, travel, school load, summer break",
  "workTargetLabel",
  "daily rotating work target set to",
  "Backend Admin: Chore Feedback Approvals",
  "choreFeedbackQueue",
  "renderChoreFeedbackApprovals",
  "Suggest Edit",
  "Monthly Points Podium",
  "pointsFirst",
  "pointsSecond",
  "pointsThird",
  "awardPointsBonusBtn",
  "awardMonthlyPointsBonuses",
  "monthlyPointsWinners",
  "monthlyPointsBonusForRank",
  "data-points-child",
  "button.dataset.pointsChild",
  "hasMonthlyPointsBonusAward",
  "place monthly points bonus",
  "Monthly points bonuses awarded",
  "familyPhotoFeed",
  "normalizeFamilyPhotoPost",
  "normalizeMonthlyPoints",
  "hasPostLike",
  "hasPostEncouragement",
  "familyFeedStatus",
  "You already liked this photo",
  "You already encouraged this photo",
  "addMonthlyPoints",
  "renderFamilyPhotoFeed",
  "Generic room-only photos are not accepted",
  "teamworkChoresChoreState",
  "teamworkChoresBetaData",
  "teamworkChoresAuthProvider",
  "Charge Missed Deadline Fine",
  "confirmMoneyAction",
  "Money action cancelled. No account changes were made.",
  "missed-deadline fine",
  "No fine records for",
  "Missed ${deadline} deadline",
  "dateKey: localDateKey()",
  "already has a manual missed-deadline fine",
  "hasSameDayDeadlineFine",
  "existingDeadlineFine",
  "no duplicate fine was added",
  "deadline ${item.deadline}",
  "Beta Data Tools",
  "appBuildLabel",
  "Beta build 2026-06-12",
  "appBuildSummary",
  "build: appBuildLabel",
  "Use this label after each GitHub/Netlify publish",
  "Local beta data summary loading",
  "renderBetaDataSummary",
  "finalized reviews",
  "active extensions",
  "review reminder cues",
  "reviewReminderLog",
  "renderReviewReminderLog",
  "logReviewReminder",
  "No noon reminder cues logged yet today",
  "Older reminder cues stay in the beta backup",
  "reviewReminderLog.filter(item => item.date === localDateKey())",
  "helper pay weeks",
  "ingredient requests",
  "No ingredient requests yet",
  "ingredientRequestDetail",
  "markIngredientPurchased",
  "Only Brigham or Karmel can mark ingredient requests purchased",
  "purchasedBy",
  "purchasedAt",
  "teamworkChoresBetaDataMeta",
  "Beta Feedback Log",
  "betaFeedback",
  "Only Brigham or Karmel can mark beta feedback resolved",
  "resolvedBy",
  "addFeedbackBtn",
  "feedbackList",
  "currentBonusPeriod",
  "nextBonusResetLabel",
  "Current monthly bonus period",
  "bonusEligibilityNote",
  "nextBonusEligibility",
  "eligible now for the",
  "bonusAuditDetail",
  "awardedBy",
  "awardedAt",
  "awarded by",
  "needs ${nextMilestone.remaining} more",
  "received all configured bonus milestones",
  "bonusLedgerSummary",
  "chore account balance is",
  "No bonus records for",
  "pending bonus records",
  "Chore Account Activity",
  "renderAccountActivity",
  "renderAccountActivity(child);",
  "accountActivitySummary",
  "Net chore account after open fines",
  "accountActivityLedger",
  "Bonuses and fines will appear here together once beta testing starts",
  "Text Reminder Settings",
  "childCellPhoneInput",
  "childTextReminderConsent",
  "saveChildContactSettings",
  "saveProductionChildContact",
  "textReminders",
  "Add a 10-digit cell phone number before turning on text reminders",
  "teamworkChoresSidebarCollapsed",
  "sidebar-collapsed",
  "Hide Family Sidebar",
  "Show Family Sidebar",
  "fineAuditDate",
  "fineAuditDetail",
  "parseCurrencyInput",
  "parseWholeNumberInput",
  "imageFileError",
  "Use an image under 2 MB so beta backups stay reliable",
  "Choose an image file",
  "The browser could not read that proof photo",
  "The browser could not read that profile photo",
  "loadProductionBackend",
  "backendModeStatus",
  "signInWithOAuth",
  "link-google-member",
  "auth-google",
  "saveProductionChoreRecord",
  "loadProductionChoreRecords",
  "hydrateProductionChoreRecords",
  "saveProductionProofPhoto",
  "chore-record",
  "Cloud chore completion failed",
  "Cloud proof photo save failed",
  "Cloud chore review failed",
  "saveProductionFamilySettings",
  "loadProductionFamilySettings",
  "loadProductionFamilySnapshot",
  "hydrateProductionFamilySnapshot",
  "saveProductionChoreLibrary",
  "loadProductionChoreLibrary",
  "hydrateProductionBackendData",
  "loadProductionMoneyLedger",
  "hydrateProductionMoneyLedger",
  "loadProductionExtensionRequests",
  "sendProductionExtensionRequest",
  "decideProductionExtensionRequest",
  "hydrateProductionExtensionRequests",
  "loadProductionAvailabilityHolds",
  "saveProductionAvailabilityHold",
  "removeProductionAvailabilityHold",
  "loadProductionChoreFeedback",
  "submitProductionChoreFeedback",
  "reviewProductionChoreFeedback",
  "saveProductionMemberRules",
  "sendProductionTeenReminder",
  "saveProductionPushSubscription",
  "loadProductionNotificationLog",
  "renderProductionNotificationLog",
  "Production Notification Log",
  "refreshNotificationLogBtn",
  "notification-log",
  "loadProductionHelperTime",
  "saveProductionHelperTimeShift",
  "markProductionHelperPayPaid",
  "helper-time",
  "Cloud helper time save failed",
  "Cloud helper pay update failed",
  "loadProductionHelperWorkspace",
  "saveProductionHelperBoardTasks",
  "addProductionIngredientRequests",
  "markProductionIngredientPurchased",
  "helper-workspace",
  "Cloud helper priority save failed",
  "Cloud ingredient request save failed",
  "Cloud ingredient purchase update failed",
  "enableChildPushNotifications",
  "urlBase64ToUint8Array",
  "family-settings",
  "chore-library",
  "teen-reminder",
  "push-subscription",
  "Enable Push",
  "Cloud family rules save failed",
  "Cloud chore add failed",
  "Cloud chore edit failed",
  "Cloud chore toggle failed",
  "Cloud chore delete failed",
  "Text sent to ${child.name}",
  "has not opted in to redo texts",
  "Redo saved, but text failed",
  "saveProductionMoneyLedger",
  "money-ledger",
  "CONFIRM MONEY",
  "Cloud fine save failed",
  "Cloud bonus save failed",
  "Cloud paid-fine save failed",
  "uploadToSignedUrl",
  "saveProductionProfilePhoto",
  "saveProductionFamilyHeroPhoto",
  "clearProductionFamilyHeroPhoto",
  "clearProductionProfilePhoto",
  "Cloud family photo clear failed",
  "Cloud profile photo clear failed",
  "Backend Admin: Family Hero Photo",
  "saveFamilyHeroPhoto",
  "clearFamilyHeroPhoto",
  "Only ${child.name} or Brigham/Karmel can edit this profile photo",
  "Family hero photo was uploaded to cloud storage and saved for local home preview",
  "Use valid bonus amounts like 5, 10.50, or 100",
  "Use a valid fine amount like 2, 5, or 7.50",
  "Use a valid hourly rate like 17 or 17.50",
  "Credit $${bonus.amount}",
  "Award monthly points bonuses totaling",
  "chargedBy",
  "chargedAt",
  "paidBy",
  "paidAt",
  "ensureCurrentMonthlyStreakPeriod",
  "isCurrentBonusPeriodRecord",
  "hasBonusAward",
  "creditDailyStreakIfEarned",
  "streakCredited",
  "isChildReviewFinalized",
  "Selected Child Finalized",
  "review is already finalized for today",
  "marked ready for ${familySettings.reviewRecipient}'s physical inspection",
  "was reopened before final review",
  "undoneAt",
  "completed ? \"Undo\"",
  "Redo ready for review",
  "redoneAt",
  "Redo Done",
  "redo completed",
  "canManageChildTasks",
  "Only that child or Brigham/Karmel can mark child chores complete",
  "Only that child or Brigham/Karmel can add proof photos for child chores",
  "photo proof for ${chore.name} was saved",
  "Photo ready for review",
  "existingRecord.completedAt || new Date().toISOString()",
  "Export Backup",
  "Import Backup",
  "backupFileSummary",
  "exportedBy",
  "backupSummary",
  "Reading backup details",
  "Exported ${shortDateTime(backup.exportedAt)} by",
  "The browser could not read this file",
  "The browser could not read that backup file",
  "validateBetaBackup",
  "betaDataPendingStatusKey",
  "sessionStorage.setItem(betaDataPendingStatusKey",
  "restorePendingBetaStatus",
  "The dashboard reloaded so imported beta data is clean",
  "Local beta data reset complete",
  "Fresh Start Accounts",
  "freshStartChildAccounts",
  "Fresh start applied today",
  "lastAccountFreshStartAt",
  "familyPhotoStoreKey",
  "getStoredFamilyPhoto",
  "familyPhoto: getStoredFamilyPhoto()",
  "normalizeStoredPhoto",
  "normalizeChildPhotos",
  "normalizeGmailLinks",
  "const cleanFamilyPhoto = normalizeStoredPhoto(validBackup.familyPhoto)",
  "localStorage.setItem(familyPhotoStoreKey, cleanFamilyPhoto)",
  "localStorage.setItem(photoStoreKey, JSON.stringify(normalizeChildPhotos(validBackup.childPhotos || {})))",
  "localStorage.setItem(gmailStoreKey, JSON.stringify(normalizeGmailLinks(validBackup.gmailLinks || {})))",
  "localStorage.removeItem(familyPhotoStoreKey)",
  "${familyPhotoCount} family photo",
  "That backup version is not supported by this beta app",
  "Backup section ${section} is missing or invalid",
  "Backup family photo is invalid",
  "Finalize Selected Child",
  "Finalize All Children",
  "reviewSummary",
  "missedReviewDetail",
  "Fine reason:",
  "Reasons: ${chargedDetails.join(\" | \")}",
  "waiting for inspection",
  "sent back for redo",
  "fineAssessments",
  "30-Day Forecast",
  "forecastList",
  "noticeAllowsChore",
  "noticeLabel",
  "frequencyAllowsChore",
  "fitAllowsChild",
  "rotatingDailyMinuteCap",
  "chore.minutes <= dailyTarget",
  "Boys only",
  "No eligible rotating chores under ${getDailyMinuteTarget(child)} minutes",
  "choreAuditDetail",
  "createdBy",
  "updatedBy",
  "last changed by",
  "tieBreak",
  "schedule frequency, notice timing",
  "approved-for fit",
  "Family Rule Settings",
  "familySettings",
  "familySettingsAudit",
  "Production Backend Readiness",
  "checkBackendReadiness",
  "backend-health",
  "backendReadinessSummary",
  "readyForWorkflowBeta",
  "Family rules last saved by",
  "Family rules saved by",
  "Save Family Rules",
  "table-scroll",
  "min-width: 1120px",
  ".task-actions button",
  "choreAdminForm",
  "data-edit-chore-name",
  "data-edit-chore-minutes",
  "data-edit-chore-difficulty",
  "data-edit-chore-training",
  "saveChoreEdit",
  "Future rotations and fairness previews now use the new settings",
  "Only Brigham or Karmel can add chores to the master rotation",
  "Only Brigham or Karmel can change the master chore rotation",
  "Only Brigham or Karmel can edit chores in the master rotation",
  "already in the master chore list",
  "replace(/\\s+/g, \" \")",
  "helperBoardTasks",
  "saveHelperBoardOrder",
  "helper-task-actions",
  "data-helper-move",
  "moveHelperTask",
  "Vanessa's priority order was saved",
  "dragBound",
  "canUseHelperWorkspace",
  "renderHelperLocks",
  "Pay rate is parent-admin controlled",
  "Number(currentRecord.rate || helperRate || 17)",
  "normalizeHelperPayRecord",
  "helperPayRecords = data.helperPayRecords.map(normalizeHelperPayRecord).slice(0, 80)",
  "Imported shift ${index + 1}",
  "paidBy: recordData.paid ? String(recordData.paidBy || \"Admin\").trim() || \"Admin\" : \"\"",
  "helperWeeklyHours = Math.max(0, Number(data.helperWeeklyHours))",
  "helperRate = Math.max(0, Number(data.helperRate))",
  "helperPayRecords = helperPayRecords.map(normalizeHelperPayRecord)",
  "syncCurrentHelperWeek",
  "shifts: []",
  "currentRecord.shifts",
  "savedBy",
  "savedAt",
  "markHelperPayPaid",
  "data-helper-pay-index",
  "Only Brigham or Karmel can mark Vanessa's pay paid",
  "Mark Vanessa's ${record.week} paycheck",
  "paidBy",
  "paidAt",
  "30-Day Fairness",
  "fairnessList",
  "calculateFairnessSummary",
  "Beta Readiness Checklist",
  "cannot edit fine rates, bonus rates, pay rates, or award/charge money",
  "Ready to test",
  "Production Web App"
];

for (const marker of requiredMarkers) {
  if (!appHtml.includes(marker)) {
    throw new Error(`Missing expected app marker: ${marker}`);
  }
}

if (appHtml.includes('placeholder="D${chore.difficulty}"')) {
  throw new Error("Priority chore difficulty placeholders must use choreDifficulty() so Dundefined cannot render.");
}

const childSeedBlock = appHtml.match(/const children = \[([\s\S]*?)\n    \];/)?.[1] || "";
for (const nonZeroSeed of [
  /streak:\s*(?!0\b)\d+/,
  /monthlyStreak:\s*(?!0\b)\d+/,
  /openFines:\s*(?!0\b)\d+/,
  /paidFines:\s*(?!0\b)\d+/,
  /accountBalance:\s*(?!0\b)\d+/
]) {
  if (nonZeroSeed.test(childSeedBlock)) {
    throw new Error("Child account defaults must start fresh with zero balances, fines, streaks, and points.");
  }
}

if (!appHtml.includes("thayne: []") || !appHtml.includes("brielle: []")) {
  throw new Error("Fine and bonus ledgers must start empty for a fresh family launch.");
}

const requiredGuideMarkers = [
  "Teamwork Chores Beta Testing Guide",
  "Daily Child Test",
  "Save Family Rule Settings once and confirm the panel shows who saved the rules and when",
  "invalid rule time and one invalid text number",
  "Try opening another child’s direct dashboard link",
  "Use Undo before parent review",
  "returns to incomplete",
  "backend dashboard, then confirm the home page displays the saved photos without exposing edit controls",
  "photo-first proof marks the chore ready for review",
  "oversized proof photo",
  "Parent Noon Review Test",
  "opens a text draft to Mom Karmel at 801-427-9293",
  "logs Mom Karmel's number",
  "only today’s noon reminder cues",
  "Review Text Queued Today",
  "does not create a duplicate reminder record",
  "parent-locked for Brigham/Karmel only",
  "chore minutes/difficulty",
  "fine and bonus ledger amounts/dates",
  "helper task priority lists and ingredient request names",
  "finalized review records, extension deadlines, extension audit logs, review reminder logs",
  "feedback notes and resolved status",
  "chore checkbox, proof photo, redo, and approval statuses",
  "family photo, child photo, and Gmail link restore values",
  "helper weekly hours, rate, shifts, and paid audit details",
  "family rule times, approver, and text contacts",
  "finalized chores lock",
  "Redo Done",
  "returns to waiting for inspection",
  "actual missed deadline",
  "second click is blocked for that day",
  "manual missed-deadline fine before final review",
  "no duplicate fine is added",
  "who charged the fine",
  "who marked it paid",
  "Extension Test",
  "Text Extension Request opens a text draft to Brigham at 801-830-0011",
  "Extension Request Locked",
  "prevents sending a child’s extension petition",
  "parent petition sending still works",
  "logs the request and Brigham's approval or denial",
  "invalid extension time",
  "changes only when Brigham approves",
  "master chore rows show who added or last changed rotation settings and when",
  "training notes",
  "Delete a test chore",
  "daily work-minute target",
  "busy sports season or open summer week",
  "Past 30 Days fairness view",
  "completed rotating minutes compare against each child’s active-day target",
  "raised high enough to allow that individual chore",
  "vacation or sick hold",
  "daily, 7-day, and 30-day forecast views",
  "Chore Feedback Approvals",
  "family feed/points update",
  "invalid minutes and invalid difficulty",
  "over-30-minute chore and confirm it does not appear",
  "approved-for fit",
  "separate 5-day, 7-day, 30-day, and super-bonus milestones",
  "bonus rows show who awarded the money and when it was awarded",
  "monthly positivity points update on the points podium",
  "duplicate likes or encouragements do not add extra points",
  "Award Monthly Points Bonuses",
  "top three points earners receive cash bonuses only once per month",
  "cannot edit fine rates, bonus rates, pay rates, or award/charge money",
  "cannot mark child chores complete or add proof photos",
  "up/down controls to confirm priority order also works on mobile",
  "the family photo, child photos, and Gmail links are cleared",
  "reset-complete message",
  "export status lists who exported it and the backup contents summary",
  "preview shows exported date, exported by, and key counts before importing",
  "clean imported-data success message",
  "backup file cannot be read",
  "family photo, child photos, Gmail links",
  "helper pay records",
  "child account totals",
  "bonus rules",
  "Vanessa Helper Test",
  "invalid bonus amount and one invalid fine amount",
  "invalid hourly rate",
  "shift entry audit",
  "helper pay week paid",
  "paid-by audit details",
  "Confirm a new week starts a new pay record",
  "mark one purchased as Brigham or Karmel",
  "local beta data summary",
  "app build label",
  "finalized reviews, extensions, extension audit events, review reminder cues, availability holds, chore feedback suggestions, family feed posts, helper pay weeks, ingredient requests",
  "After a new GitHub/Netlify publish",
  "Beta Feedback Log",
  "Anyone can add feedback",
  "Known Prototype Limits",
  "Ready For Production When",
  "Backend Setup Track",
  "supabase/seed-teamwork-chores.sql",
  "Karmel and Brigham admin profiles",
  "link-google-member",
  "links that Gmail to the matching family member record",
  "chore-record",
  "completion/review guardrail",
  "family-settings",
  "chore-library",
  "scheduled opted-in teen reminder texts",
  "notification-log",
  "Web Push subscriptions",
  "Web Push VAPID",
  "redo texts",
  "parent-admin",
  "money-ledger",
  "child cell phone field, toggle text reminder permission"
];

for (const marker of requiredGuideMarkers) {
  if (!betaGuide.includes(marker)) {
    throw new Error(`Missing expected beta guide marker: ${marker}`);
  }
  if (!betaGuideHtml.includes(marker)) {
    throw new Error(`Missing expected beta guide HTML marker: ${marker}`);
  }
}

const requiredGuideHtmlOnlyMarkers = [
  "teamworkChoresBetaGuideChecklist",
  "Reset Checklist",
  "updateChecklistProgress",
  "check-item.done"
];

for (const marker of requiredGuideHtmlOnlyMarkers) {
  if (!betaGuideHtml.includes(marker)) {
    throw new Error(`Missing expected checklist guide HTML marker: ${marker}`);
  }
}

const requiredPhasePlanMarkers = [
  "Parent admin roles for Brigham and Karmel",
  "Helper role for Vanessa",
  "Production Web App Gate",
  "backend token verification",
  "Role-based authorization enforced on the backend",
  "privacy controls and retention rules",
  "Resolve all blocking beta feedback"
];

for (const marker of requiredPhasePlanMarkers) {
  if (!phasePlan.includes(marker)) {
    throw new Error(`Missing expected phase plan marker: ${marker}`);
  }
}

const requiredAppIds = [
  "loginOverlay",
  "googleLoginBtn",
  "toggleSidebarBtn",
  "appShell",
  "familySettingsForm",
  "saveFamilySettingsBtn",
  "extensionStatus",
  "textExtensionBtn",
  "streakPodium",
  "podiumLeadNote",
  "streakTasks",
  "rotatingTasks",
  "reviewList",
  "reviewSummary",
  "sendReviewBtn",
  "finalizeChildBtn",
  "finalizeAllBtn",
  "fineLedger",
  "fineLedgerSummary",
  "chargeFineBtn",
  "bonusLedger",
  "bonusLedgerSummary",
  "bonusPeriodNote",
  "bonusEligibilityNote",
  "awardBonusBtn",
  "accountActivityName",
  "accountBonusMetric",
  "accountFineMetric",
  "accountNetMetric",
  "accountActivitySummary",
  "accountActivityLedger",
  "familyHeroAdminForm",
  "familyHeroImageUrl",
  "familyHeroPhotoFile",
  "saveFamilyHeroPhotoBtn",
  "clearFamilyHeroPhotoBtn",
  "profileAdminForm",
  "choreAdminForm",
  "choreTable",
  "forecastList",
  "fairnessList",
  "betaDataAdminForm",
  "betaDataSummary",
  "backupFileSummary",
  "exportBetaDataBtn",
  "importBetaDataBtn",
  "resetBetaDataBtn",
  "freshStartAccountsBtn",
  "feedbackForm",
  "feedbackCategory",
  "feedbackSeverity",
  "feedbackPerson",
  "feedbackText",
  "addFeedbackBtn",
  "feedbackStatus",
  "feedbackList",
  "backendReadinessSummary",
  "backendReadinessList",
  "backendReadinessStatus",
  "checkBackendReadinessBtn",
  "helperBoard",
  "helperWorkspaceStatus",
  "helperTimeCardForm",
  "ingredientRequestForm",
  "ingredientList"
];

const appIds = new Set(extractStaticIds(appHtml));
for (const id of requiredAppIds) {
  if (!appIds.has(id)) {
    throw new Error(`Missing required app control id: ${id}`);
  }
}

if (!homeHtml.includes('href="/beta-testing-guide.html"')) {
  throw new Error("Home hub is missing beta guide link.");
}
if (homeHtml.includes("Design Options")) {
  throw new Error("Home hub should not show the old Design Options button.");
}

const requiredHomeMarkers = [
  "homePhotoAdminStatus",
  "Photo Admin",
  "Open Backend Dashboard",
  "Brigham or Karmel can edit them in the backend dashboard",
  "renderStoredPhotos",
  "choreAppFamilyPhoto",
  "choreAppChildPhotos"
];

for (const marker of requiredHomeMarkers) {
  if (!homeHtml.includes(marker)) {
    throw new Error(`Missing expected home hub marker: ${marker}`);
  }
}

for (const removedHomeMarker of ["saveFamilyPhotoBtn", "saveChildPhotoBtn", "familyPhotoFile", "homeChildPhotoFile", "familyPhotoUrl", "homeChildPhotoUrl"]) {
  if (homeHtml.includes(removedHomeMarker)) {
    throw new Error(`Home hub should not expose photo editing control: ${removedHomeMarker}`);
  }
}

if (!appHtml.includes('href="/beta-testing-guide.html"')) {
  throw new Error("Dashboard is missing beta guide link.");
}

for (const html of [appHtml, homeHtml, betaGuideHtml]) {
  if (!html.includes('rel="manifest" href="/manifest.webmanifest"')) {
    throw new Error("Missing PWA manifest link.");
  }
  if (!html.includes('navigator.serviceWorker.register("/service-worker.js")')) {
    throw new Error("Missing service worker registration.");
  }
}

if (manifest.name !== "Teamwork Chores" || manifest.start_url !== "/app" || manifest.display !== "standalone") {
  throw new Error("Manifest is missing required app install metadata.");
}

const requiredNetlifyMarkers = [
  'command = "npm run build"',
  'publish = "outputs"',
  'from = "/app"',
  'to = "/family-chore-dashboard-prototype.html"',
  'from = "/beta-guide"',
  'to = "/beta-testing-guide.html"',
  'for = "/service-worker.js"',
  'must-revalidate'
];

for (const marker of requiredNetlifyMarkers) {
  if (!netlifyConfig.includes(marker)) {
    throw new Error(`Netlify config is missing: ${marker}`);
  }
}

const requiredDeployWorkflowMarkers = [
  "Deploy to Netlify",
  "branches:",
  "- main",
  "npm run build",
  "netlify-cli deploy --prod --dir=outputs",
  "NETLIFY_AUTH_TOKEN",
  "NETLIFY_SITE_ID"
];

for (const marker of requiredDeployWorkflowMarkers) {
  if (!deployWorkflow.includes(marker)) {
    throw new Error(`Deploy workflow is missing: ${marker}`);
  }
}

if (!packageJson.dependencies?.["@supabase/supabase-js"] || !packageJson.dependencies?.twilio || !packageJson.dependencies?.["web-push"]) {
  throw new Error("Package dependencies must include Supabase, Twilio, and Web Push for production backend functions.");
}

const requiredEnvMarkers = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_CLIENT_ID",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_MESSAGING_SERVICE_SID",
  "WEB_PUSH_VAPID_PUBLIC_KEY",
  "WEB_PUSH_VAPID_PRIVATE_KEY",
  "WEB_PUSH_SUBJECT",
  "KARMEL_NOON_REVIEW_PHONE",
  "BRIGHAM_EXTENSION_PHONE"
];

for (const marker of requiredEnvMarkers) {
  if (!envExample.includes(marker)) {
    throw new Error(`.env.example is missing backend env var: ${marker}`);
  }
}

const requiredBackendMarkers = [
  "Supabase Postgres",
  "Supabase Auth with Google sign-in",
  "Supabase Storage",
  "Netlify Functions",
  "Twilio",
  "Netlify Function Contracts",
  "backend-health",
  "family-snapshot",
  "chore-record",
  "chore-library",
  "family-settings",
  "teen-reminder",
  "scheduled-teen-reminders",
  "push-subscription",
  "send-push",
  "link-google-member",
  "money-ledger",
  "CONFIRM MONEY",
  "read child ledger/account history",
  "signed family/profile photo URLs",
  "reload chore completion/review records",
  "reload extension requests",
  "availability-hold",
  "read vacation/sick holds",
  "chore-feedback",
  "timing/difficulty feedback",
  "member-rules",
  "fine/work rules",
  "production chore-completion gate",
  "family_settings",
  "parent admin controls",
  "read the master chore rotation",
  "records or clears uploaded family hero",
  "scheduled-teen-reminders",
  "once-daily morning chore reminder",
  "push_subscriptions",
  "VAPID",
  "Family Seed Data",
  "seed-teamwork-chores.sql",
  "readyForWorkflowBeta",
  "scheduled-noon-review",
  "Server-Side Permissions",
  "Web Beta Ready Gate"
];

for (const marker of requiredBackendMarkers) {
  if (!backendSetup.includes(marker)) {
    throw new Error(`Backend setup guide is missing: ${marker}`);
  }
}

const requiredSchemaMarkers = [
  "create table family_members",
  "name text not null default 'Teamwork Chores' unique",
  "cell_phone text",
  "text_reminders_enabled boolean",
  "create table chores",
  "create table family_settings",
  "bonus_rules jsonb",
  "create table chore_records",
  "create table chore_feedback",
  "create table ledger_entries",
  "create table helper_pay_records",
  "create table helper_tasks",
  "create table ingredient_requests",
  "create table photos",
  "create table notification_preferences",
  "create table push_subscriptions",
  "create table notification_log",
  "alter table family_members enable row level security",
  "create policy \"admins manage chores\"",
  "create policy \"admins manage family settings\"",
  "create policy \"children submit own chore feedback\"",
  "create policy \"admins manage chore feedback\"",
  "create policy \"members update own notification preferences\"",
  "create policy \"members manage own push subscriptions\""
];

for (const marker of requiredSchemaMarkers) {
  if (!supabaseSchema.includes(marker)) {
    throw new Error(`Supabase schema is missing: ${marker}`);
  }
}

const requiredSeedMarkers = [
  "karmel.larson@gmail.com",
  "profile_key",
  "notification_preferences",
  "family-photos",
  "family_settings",
  "801-427-9293",
  "Make 10 layered salad jars",
  "account_balance",
  "daily_work_target_minutes",
  "on conflict (name) do nothing",
  "on conflict (family_id, profile_key)",
  "on conflict (family_id, lower(name))"
];

for (const marker of requiredSeedMarkers) {
  if (!supabaseSeed.includes(marker)) {
    throw new Error(`Supabase seed is missing: ${marker}`);
  }
}

if (!authFunction.includes("memberFromAuthHeader") || !authFunction.includes("Google session is not linked")) {
  throw new Error("Google auth function is missing member verification behavior.");
}

for (const marker of [
  "createSignedUrl",
  "hero_photo_path",
  "profile_photo_path",
  "text_reminders_enabled",
  "daily_work_target_minutes",
  "fine_rate",
  "family-photos"
]) {
  if (!familySnapshotFunction.includes(marker)) {
    throw new Error(`Family snapshot function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Brigham or Karmel can edit family rule settings",
  "default_deadline",
  "review_reminder_time",
  "extension_contact",
  "review_contact",
  "bonus_rules",
  "normalizeBonusRules",
  "Use 10-digit text numbers for Dad extensions and Mom Karmel review reminders"
]) {
  if (!familySettingsFunction.includes(marker)) {
    throw new Error(`Family settings function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Brigham or Karmel can manage availability holds",
  "event.httpMethod === \"GET\"",
  "event.httpMethod === \"DELETE\"",
  "availability_holds",
  "childProfileKey",
  "removed_at",
  "Use a number of days from 1 to 60"
]) {
  if (!availabilityHoldFunction.includes(marker)) {
    throw new Error(`Availability hold function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Brigham or Karmel can edit child fine rates and work targets",
  "event.httpMethod === \"GET\"",
  "event.httpMethod !== \"PATCH\"",
  "fine_rate",
  "daily_work_target_minutes",
  "max_difficulty",
  "target_hard",
  "Use daily work target minutes from 5 to 60"
]) {
  if (!memberRulesFunction.includes(marker)) {
    throw new Error(`Member rules function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Brigham or Karmel can change the master chore rotation",
  "event.httpMethod === \"GET\"",
  ".order(\"active\"",
  "add",
  "update",
  "toggle",
  "delete",
  "training_notes",
  "difficulty",
  "Starts after 24 hours",
  "chores"
]) {
  if (!choreLibraryFunction.includes(marker)) {
    throw new Error(`Chore library function is missing: ${marker}`);
  }
}

for (const marker of [
  "Children can update only their own chore records",
  "Only Brigham or Karmel can approve chores or send them back for redo",
  "complete",
  "reopen",
  "approve",
  "redo",
  "event.httpMethod === \"GET\"",
  "publicChoreRecord",
  "createSignedUrl",
  "proofPhotoUrl",
  "startDate",
  "endDate",
  "chore_records",
  "review_status",
  "proof_photo_path",
  "A chore must be marked complete before approval"
]) {
  if (!choreRecordFunction.includes(marker)) {
    throw new Error(`Chore record function is missing: ${marker}`);
  }
}

for (const marker of [
  "Children can submit chore feedback only for their own chores",
  "Only Brigham or Karmel can accept or deny chore feedback",
  "event.httpMethod === \"GET\"",
  "event.httpMethod === \"POST\"",
  "event.httpMethod !== \"PATCH\"",
  "chore_feedback",
  "actual_minutes",
  "actual_difficulty",
  "status === \"accepted\"",
  "updated_at"
]) {
  if (!choreFeedbackFunction.includes(marker)) {
    throw new Error(`Chore feedback function is missing: ${marker}`);
  }
}

for (const marker of ["auth_user_id", ".ilike(\"gmail\", email)", "is not invited to Teamwork Chores yet", "already linked to a different Google account"]) {
  if (!linkGoogleFunction.includes(marker)) {
    throw new Error(`Google member link function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Brigham or Karmel can change money ledger records",
  "CONFIRM MONEY",
  "charge_fine",
  "award_bonus",
  "mark_fine_paid",
  "event.httpMethod === \"GET\"",
  "ledgerEntries",
  "publicLedgerEntry",
  "This fine already exists for that child and service date",
  "This bonus already exists for that child and bonus period",
  "account_balance",
  "paid_by",
  "paid_at"
]) {
  if (!moneyLedgerFunction.includes(marker)) {
    throw new Error(`Money ledger function is missing: ${marker}`);
  }
}

for (const marker of ["expectedMembers", "family-photos", "notification_log", "notification_preferences", "push_subscriptions", "Teen reminder preference and push subscription rows are reachable", "WEB_PUSH_VAPID_PUBLIC_KEY", "WEB_PUSH_VAPID_PRIVATE_KEY", "Family settings and chore library tables are reachable", "family_settings", "chore_records", "Chore record table is reachable", "ledger_entries", "Money ledger table is reachable", "helper_pay_records", "Helper pay table is reachable", "helper_tasks", "ingredient_requests", "Helper priority and ingredient request tables are reachable", "readyForWorkflowBeta", "TWILIO_MESSAGING_SERVICE_SID", "authLinked", "gmailLinked"]) {
  if (!backendHealthFunction.includes(marker)) {
    throw new Error(`Backend health function is missing readiness marker: ${marker}`);
  }
}

if (!runtimeConfigFunction.includes("SUPABASE_ANON_KEY") || !runtimeConfigFunction.includes("webPushVapidPublicKey") || !runtimeConfigFunction.includes("backendReady")) {
  throw new Error("Runtime config function is missing public backend readiness configuration.");
}

if (!memberContactFunction.includes("canManageMember") || !memberContactFunction.includes("profileKey") || !memberContactFunction.includes("Add a 10-digit cell phone number before turning on text reminders")) {
  throw new Error("Member contact function is missing child/admin phone reminder permission behavior.");
}

if (!photoFunction.includes("createSignedUploadUrl") || !photoFunction.includes("family-photos")) {
  throw new Error("Photo upload function is missing Supabase Storage signed upload behavior.");
}

if (!photoRecordFunction.includes("family_hero") || !photoRecordFunction.includes("profileKey") || !photoRecordFunction.includes("profile_photo_path") || !photoRecordFunction.includes("proof_photo_path") || !photoRecordFunction.includes("action === \"clear\"") || !photoRecordFunction.includes("hero_photo_path: null") || !photoRecordFunction.includes("profile_photo_path: null")) {
  throw new Error("Photo record function is missing family/profile/proof storage record behavior.");
}

for (const marker of [
  "You can manage only your own push subscription unless you are Brigham or Karmel",
  "push_subscriptions",
  "notification_preferences",
  "push_enabled",
  "endpoint",
  "p256dh",
  "auth"
]) {
  if (!pushSubscriptionFunction.includes(marker)) {
    throw new Error(`Push subscription function is missing: ${marker}`);
  }
}

if (!supabaseHelperFunction.includes("TWILIO_MESSAGING_SERVICE_SID") || !supabaseHelperFunction.includes("sendSms") || !smsFunction.includes("Only parent admins can send SMS reminders")) {
  throw new Error("SMS function is missing Twilio/admin guard behavior.");
}

for (const marker of [
  "Only Brigham or Karmel can read notification logs",
  "notification_log",
  "provider_message_id",
  "recipientName",
  "createdByName",
  ".eq(\"family_id\", actor.family_id)",
  "order(\"created_at\", { ascending: false })"
]) {
  if (!notificationLogFunction.includes(marker)) {
    throw new Error(`Notification log function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Vanessa, Brigham, or Karmel can save helper time",
  "Only Brigham or Karmel can mark Vanessa's pay paid",
  "CONFIRM MONEY",
  "helper_pay_records",
  "add_shift",
  "mark_paid",
  "Vanessa helper profile not found",
  ".eq(\"family_id\", actor.family_id)"
]) {
  if (!helperTimeFunction.includes(marker)) {
    throw new Error(`Helper time function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Vanessa, Brigham, or Karmel can reorder helper priorities",
  "Only Vanessa, Brigham, or Karmel can add ingredient requests",
  "Only Brigham or Karmel can mark ingredient requests purchased",
  "helper_tasks",
  "ingredient_requests",
  "save_tasks",
  "add_ingredient",
  "mark_ingredient_purchased",
  "Vanessa helper profile not found"
]) {
  if (!helperWorkspaceFunction.includes(marker)) {
    throw new Error(`Helper workspace function is missing: ${marker}`);
  }
}

for (const marker of [
  "WEB_PUSH_VAPID_PUBLIC_KEY",
  "WEB_PUSH_VAPID_PRIVATE_KEY",
  "Only Brigham or Karmel can send push reminders",
  "webPush.sendNotification",
  "push_subscriptions",
  "has not opted in to push notifications",
  "logNotification"
]) {
  if (!pushFunction.includes(marker)) {
    throw new Error(`Push send function is missing: ${marker}`);
  }
}

for (const marker of [
  "Only Brigham or Karmel can send child chore reminder texts",
  "notify_redo",
  "notify_teen_reminders",
  "has not opted in",
  "teen_reminder",
  "redo",
  "logNotification"
]) {
  if (!teenReminderFunction.includes(marker)) {
    throw new Error(`Teen reminder function is missing: ${marker}`);
  }
}

for (const marker of [
  'schedule: "0 15 * * *"',
  "alreadySentToday",
  "notify_teen_reminders",
  "already_sent",
  "Teamwork Chores reminder for",
  "teen_reminder"
]) {
  if (!scheduledTeenFunction.includes(marker)) {
    throw new Error(`Scheduled teen reminder function is missing: ${marker}`);
  }
}

if (!extensionRequestFunction.includes("extension_contact") || !extensionRequestFunction.includes("BRIGHAM_EXTENSION_PHONE") || !extensionRequestFunction.includes("Children can request extensions only for their own chores") || !extensionRequestFunction.includes("event.httpMethod === \"GET\"") || !extensionRequestFunction.includes("childProfileKey")) {
  throw new Error("Extension request function is missing family settings SMS fallback or child ownership behavior.");
}

if (!extensionDecisionFunction.includes("Only Brigham can approve or deny") || !extensionDecisionFunction.includes("text_reminders_enabled") || !extensionDecisionFunction.includes("approvedDeadline") || !extensionDecisionFunction.includes("requested_deadline")) {
  throw new Error("Extension decision function is missing Brigham-only approval or opted-in child SMS behavior.");
}

if (!scheduledNoonFunction.includes('schedule: "0 18 * * *"') || !scheduledNoonFunction.includes("review_contact") || !scheduledNoonFunction.includes("KARMEL_NOON_REVIEW_PHONE") || !scheduledNoonFunction.includes("already_sent")) {
  throw new Error("Scheduled noon review function is missing cron, family settings phone fallback, or duplicate-send guard behavior.");
}

for (const cachedPath of ["/app", "/beta-guide", "/offline.html", "/manifest.webmanifest"]) {
  if (!serviceWorker.includes(cachedPath)) {
    throw new Error(`Service worker is missing cached path: ${cachedPath}`);
  }
}

if (!serviceWorker.includes(`const CACHE_NAME = "${expectedCacheName}"`)) {
  throw new Error(`Service worker cache name must be ${expectedCacheName}.`);
}

const requiredServiceWorkerMarkers = [
  'event.request.mode === "navigate"',
  "fetch(event.request)",
  'caches.match("/offline.html")',
  "response.ok",
  "new URL(event.request.url).origin === self.location.origin",
  "cached || refresh",
  "self.addEventListener(\"push\"",
  "showNotification",
  "notificationclick",
  "clients.openWindow"
];

for (const marker of requiredServiceWorkerMarkers) {
  if (!serviceWorker.includes(marker)) {
    throw new Error(`Service worker is missing beta cache behavior: ${marker}`);
  }
}

const cachedFiles = {
  "/": "outputs/index.html",
  "/index.html": "outputs/index.html",
  "/family-chore-dashboard-prototype.html": "outputs/family-chore-dashboard-prototype.html",
  "/beta-testing-guide.html": "outputs/beta-testing-guide.html",
  "/offline.html": "outputs/offline.html",
  "/manifest.webmanifest": "outputs/manifest.webmanifest",
  "/icons/teamwork-chores-icon.svg": "outputs/icons/teamwork-chores-icon.svg"
};

for (const [cachedPath, file] of Object.entries(cachedFiles)) {
  if (!serviceWorker.includes(`"${cachedPath}"`)) {
    throw new Error(`Service worker app shell is missing ${cachedPath}.`);
  }
  await access(file);
}

console.log("Static site files verified.");
