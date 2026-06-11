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
const manifest = JSON.parse(await readFile("outputs/manifest.webmanifest", "utf8"));
const serviceWorker = await readFile("outputs/service-worker.js", "utf8");

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
  "Continue with Google",
  "All-Time Streak Podium",
  "Best overall lead for lifetime streaks",
  "renderStreakPodium",
  "data-podium-child",
  "escapeHtml",
  "No eligible rotating chores are active",
  "teamworkChoresChoreState",
  "teamworkChoresBetaData",
  "teamworkChoresAuthProvider",
  "Charge Missed Deadline Fine",
  "Missed ${deadline} deadline",
  "deadline ${escapeHtml(item.deadline)}",
  "Beta Data Tools",
  "Local beta data summary loading",
  "renderBetaDataSummary",
  "teamworkChoresBetaDataMeta",
  "Beta Feedback Log",
  "betaFeedback",
  "addFeedbackBtn",
  "feedbackList",
  "currentBonusPeriod",
  "nextBonusResetLabel",
  "Current monthly bonus period",
  "ensureCurrentMonthlyStreakPeriod",
  "isCurrentBonusPeriodRecord",
  "hasBonusAward",
  "creditDailyStreakIfEarned",
  "streakCredited",
  "isChildReviewFinalized",
  "Selected Child Finalized",
  "review is already finalized for today",
  "existingRecord.completedAt || new Date().toISOString()",
  "Export Backup",
  "Import Backup",
  "Finalize Selected Child",
  "Finalize All Children",
  "fineAssessments",
  "30-Day Forecast",
  "forecastList",
  "noticeAllowsChore",
  "frequencyAllowsChore",
  "fitAllowsChild",
  "tieBreak",
  "schedule frequency, notice timing",
  "approved-for fit",
  "Family Rule Settings",
  "familySettings",
  "Save Family Rules",
  "choreAdminForm",
  "Only Brigham or Karmel can add chores to the master rotation",
  "Only Brigham or Karmel can change the master chore rotation",
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
  "photo-first proof marks the chore ready for review",
  "Parent Noon Review Test",
  "finalized chores lock",
  "actual missed deadline",
  "Extension Test",
  "changes only when Brigham approves",
  "approved-for fit",
  "separate 5-day, 7-day, 30-day, and super-bonus milestones",
  "photos and Gmail links are cleared",
  "Vanessa Helper Test",
  "Confirm a new week starts a new pay record",
  "local beta data summary",
  "Beta Feedback Log",
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

const requiredAppIds = [
  "loginOverlay",
  "googleLoginBtn",
  "familySettingsForm",
  "saveFamilySettingsBtn",
  "extensionStatus",
  "streakPodium",
  "streakTasks",
  "rotatingTasks",
  "reviewList",
  "sendReviewBtn",
  "finalizeChildBtn",
  "finalizeAllBtn",
  "fineLedger",
  "chargeFineBtn",
  "bonusLedger",
  "bonusPeriodNote",
  "awardBonusBtn",
  "profileAdminForm",
  "choreAdminForm",
  "choreTable",
  "forecastList",
  "fairnessList",
  "betaDataAdminForm",
  "betaDataSummary",
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

for (const cachedPath of ["/app", "/beta-guide", "/offline.html", "/manifest.webmanifest"]) {
  if (!serviceWorker.includes(cachedPath)) {
    throw new Error(`Service worker is missing cached path: ${cachedPath}`);
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
