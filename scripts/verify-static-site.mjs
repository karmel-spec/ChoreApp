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
  "approvedDeadlineFor",
  "setApprovedDeadline",
  "clearApprovedDeadline",
  "Only ${familySettings.extensionApprover} can approve extension petitions",
  "textExtensionBtn",
  "extensionPetitionMessage",
  "extensionContactSmsNumber",
  "defaultReviewRecipient",
  "801-427-9293",
  "normalizeFamilyReviewContact",
  "reviewContactSmsNumber",
  "noonReviewMessage",
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
  "No eligible rotating chores are active",
  "teamworkChoresChoreState",
  "teamworkChoresBetaData",
  "teamworkChoresAuthProvider",
  "Charge Missed Deadline Fine",
  "No fine records for",
  "Missed ${deadline} deadline",
  "deadline ${escapeHtml(item.deadline)}",
  "Beta Data Tools",
  "Local beta data summary loading",
  "renderBetaDataSummary",
  "finalized reviews",
  "active extensions",
  "helper pay weeks",
  "ingredient requests",
  "No ingredient requests yet",
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
  "bonusLedgerSummary",
  "chore account balance is",
  "No bonus records for",
  "pending bonus records",
  "ensureCurrentMonthlyStreakPeriod",
  "isCurrentBonusPeriodRecord",
  "hasBonusAward",
  "creditDailyStreakIfEarned",
  "streakCredited",
  "isChildReviewFinalized",
  "Selected Child Finalized",
  "review is already finalized for today",
  "marked ready for ${familySettings.reviewRecipient}'s physical inspection",
  "photo proof for ${chore.name} was saved",
  "Photo ready for review",
  "existingRecord.completedAt || new Date().toISOString()",
  "Export Backup",
  "Import Backup",
  "backupFileSummary",
  "validateBetaBackup",
  "That backup version is not supported by this beta app",
  "Backup section ${section} is missing or invalid",
  "Finalize Selected Child",
  "Finalize All Children",
  "reviewSummary",
  "waiting for inspection",
  "sent back for redo",
  "fineAssessments",
  "30-Day Forecast",
  "forecastList",
  "noticeAllowsChore",
  "noticeLabel",
  "frequencyAllowsChore",
  "fitAllowsChild",
  "tieBreak",
  "schedule frequency, notice timing",
  "approved-for fit",
  "Family Rule Settings",
  "familySettings",
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
  "dragBound",
  "canUseHelperWorkspace",
  "renderHelperLocks",
  "Pay rate is parent-admin controlled",
  "Number(currentRecord.rate || helperRate || 17)",
  "syncCurrentHelperWeek",
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
  "Try opening another child’s direct dashboard link",
  "photo-first proof marks the chore ready for review",
  "Parent Noon Review Test",
  "opens a text draft to Karmel at 801-427-9293",
  "finalized chores lock",
  "actual missed deadline",
  "Extension Test",
  "Text Extension Request opens a text draft to Brigham at 801-830-0011",
  "changes only when Brigham approves",
  "approved-for fit",
  "separate 5-day, 7-day, 30-day, and super-bonus milestones",
  "cannot edit fine rates, bonus rates, pay rates, or award/charge money",
  "photos and Gmail links are cleared",
  "Vanessa Helper Test",
  "Confirm a new week starts a new pay record",
  "local beta data summary",
  "finalized reviews, extensions, helper pay weeks, ingredient requests",
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
  "awardBonusBtn",
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
