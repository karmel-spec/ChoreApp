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
  ".github/workflows/deploy-netlify.yml",
  "outputs/index.html",
  "outputs/family-chore-dashboard-prototype.html",
  "outputs/chore-app-designs.html",
  "outputs/chore-app-phase-plan.md",
  "outputs/beta-testing-guide.md",
  "outputs/beta-testing-guide.html",
  "outputs/manifest.webmanifest",
  "outputs/service-worker.js",
  "outputs/offline.html",
  "outputs/icons/teamwork-chores-icon.svg"
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
const manifest = JSON.parse(await readFile("outputs/manifest.webmanifest", "utf8"));
const serviceWorker = await readFile("outputs/service-worker.js", "utf8");
const expectedCacheName = "teamwork-chores-beta-2026-06-11";

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
  "ledger = normalizeChildLedgerSet(data.ledger, \"fine\")",
  "bonusLedger = normalizeChildLedgerSet(data.bonusLedger, \"bonus\")",
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
  "No rotating chore fines accrue during this hold",
  "Muted: ${escapeHtml(hold.reason)}",
  "Muted for ${escapeHtml(hold.reason)}. No fines accrue.",
  "availability holds",
  "chore feedback suggestions",
  "family feed posts",
  "Excused: ${excusedChildren.join(\", \")}",
  "childWorkTargets",
  "renderFairnessTargets",
  "Backend Admin: Chore Feedback Approvals",
  "choreFeedbackQueue",
  "renderChoreFeedbackApprovals",
  "Suggest Edit",
  "Monthly Points Podium",
  "familyPhotoFeed",
  "addMonthlyPoints",
  "renderFamilyPhotoFeed",
  "Generic room-only photos are not accepted",
  "teamworkChoresChoreState",
  "teamworkChoresBetaData",
  "teamworkChoresAuthProvider",
  "Charge Missed Deadline Fine",
  "No fine records for",
  "Missed ${deadline} deadline",
  "dateKey: localDateKey()",
  "already has a manual missed-deadline fine",
  "deadline ${item.deadline}",
  "Beta Data Tools",
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
  "accountActivitySummary",
  "Net chore account after open fines",
  "accountActivityLedger",
  "Bonuses and fines will appear here together once beta testing starts",
  "fineAuditDate",
  "fineAuditDetail",
  "parseCurrencyInput",
  "parseWholeNumberInput",
  "imageFileError",
  "Use an image under 2 MB so beta backups stay reliable",
  "Choose an image file",
  "The browser could not read that proof photo",
  "The browser could not read that profile photo",
  "Use valid bonus amounts like 5, 10.50, or 100",
  "Use a valid fine amount like 2, 5, or 7.50",
  "Use a valid hourly rate like 17 or 17.50",
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
  "Family rules last saved by",
  "Family rules saved by",
  "Save Family Rules",
  "table-scroll",
  "min-width: 720px",
  ".task-actions button",
  "choreAdminForm",
  "Only Brigham or Karmel can add chores to the master rotation",
  "Only Brigham or Karmel can change the master chore rotation",
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

const requiredGuideMarkers = [
  "Teamwork Chores Beta Testing Guide",
  "Daily Child Test",
  "Save Family Rule Settings once and confirm the panel shows who saved the rules and when",
  "invalid rule time and one invalid text number",
  "Try opening another child’s direct dashboard link",
  "Use Undo before parent review",
  "returns to incomplete",
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
  "cannot edit fine rates, bonus rates, pay rates, or award/charge money",
  "cannot mark child chores complete or add proof photos",
  "up/down controls to confirm priority order also works on mobile",
  "the family photo, child photos, and Gmail links are cleared",
  "export status lists who exported it and the backup contents summary",
  "preview shows exported date, exported by, and key counts before importing",
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
  "finalized reviews, extensions, extension audit events, review reminder cues, availability holds, chore feedback suggestions, family feed posts, helper pay weeks, ingredient requests",
  "After a new GitHub/Netlify publish",
  "Beta Feedback Log",
  "Anyone can add feedback",
  "Known Prototype Limits",
  "Ready For Production When"
];

for (const marker of requiredGuideMarkers) {
  if (!betaGuide.includes(marker)) {
    throw new Error(`Missing expected beta guide marker: ${marker}`);
  }
  if (!betaGuideHtml.includes(marker)) {
    throw new Error(`Missing expected beta guide HTML marker: ${marker}`);
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
  "feedbackForm",
  "feedbackCategory",
  "feedbackSeverity",
  "feedbackPerson",
  "feedbackText",
  "addFeedbackBtn",
  "feedbackStatus",
  "feedbackList",
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
  "teamworkChoresSession",
  "isHomePhotoAdmin",
  "Photo tools are locked until Brigham or Karmel signs in",
  "Only Brigham or Karmel can edit family photos",
  "Only Brigham or Karmel can edit child photos",
  "imageFileError",
  "Use an image under 2 MB so beta backups stay reliable",
  "The browser could not read that family photo",
  "The browser could not read that child photo"
];

for (const marker of requiredHomeMarkers) {
  if (!homeHtml.includes(marker)) {
    throw new Error(`Missing expected home hub marker: ${marker}`);
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
  "cached || refresh"
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
