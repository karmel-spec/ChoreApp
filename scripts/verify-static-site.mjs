import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "outputs/index.html",
  "outputs/family-chore-dashboard-prototype.html",
  "outputs/chore-app-designs.html",
  "outputs/chore-app-phase-plan.md"
];

for (const file of requiredFiles) {
  await access(file);
}

const appHtml = await readFile("outputs/family-chore-dashboard-prototype.html", "utf8");

const requiredMarkers = [
  "Teamwork Chores",
  "Mom's Helper",
  "Build Roadmap",
  "Grant Dad-Approved Extension",
  "Continue with Google",
  "All-Time Streak Podium",
  "teamworkChoresChoreState"
];

for (const marker of requiredMarkers) {
  if (!appHtml.includes(marker)) {
    throw new Error(`Missing expected app marker: ${marker}`);
  }
}

console.log("Static site files verified.");
