# Teamwork Chores Beta Testing Guide

Use this guide for the first 2-4 weeks of website beta testing before moving toward production web app work or app-store packaging.

## Before Testing

1. Open the hosted website and install it to a phone home screen if the browser offers that option.
2. Have Brigham or Karmel sign in as an admin.
3. Review Family Rule Settings:
   - Default rotating chore deadline
   - Review reminder time
   - Extension approver and contact
   - Review recipient and contact
4. Add or adjust child profile photos.
5. Export a backup before making major changes.

## Daily Child Test

Each child should test:

1. Sign in with their profile.
2. Confirm their daily priority chores appear first.
3. Try opening another child’s direct dashboard link and confirm the app returns them to their own dashboard.
4. Complete priority chores.
5. Use Undo before parent review and confirm the chore returns to incomplete.
6. Complete rotating chores.
7. Add at least one photo proof during the week and confirm photo-first proof marks the chore ready for review.
8. Check the 7-day view and notice whether future assignments look understandable.
9. Watch for celebration messages and whether they feel age-appropriate.

## Parent Noon Review Test

Each day, Brigham or Karmel should test:

1. Send the noon review text cue.
2. On a phone, confirm the cue opens a text draft to Karmel at 801-427-9293.
3. Physically inspect chores.
4. Approve completed chores.
5. Send one chore back for redo during beta to test the loop.
6. Have the child tap Redo Done and confirm it returns to waiting for inspection.
7. Finalize the selected child or all children.
8. Confirm missed rotating chores charge a fine only once for the day.
9. Confirm the fine ledger shows the actual missed deadline, including any Brigham-approved extension time.
10. Confirm fine rows show who charged the fine, when it was charged, and who marked it paid.
11. Confirm finalized chores lock against late edits.
12. Mark a fine paid and confirm the open fine total changes.

## Extension Test

Once during beta:

1. Sign in as a child and confirm Text Extension Request opens a text draft to Brigham at 801-830-0011.
2. Sign in as Karmel and confirm extension approval is locked.
3. Sign in as Brigham and approve or deny an extension.
4. Confirm the selected child’s rotating chore deadline changes only when Brigham approves.

## Admin Rotation Test

At least twice per week:

1. Toggle chores on and off in the master chore list.
2. Add one new chore with schedule, minutes, difficulty, and approved-for settings.
3. Confirm non-admin logins cannot edit the master chore list.
4. Use Shuffle Preview.
5. Check the 30-day forecast for one younger child and one older child.
6. Confirm schedule, notice timing, approved-for fit, and difficulty rules look right.
7. Check 30-Day Fairness and note if one child seems overloaded.

## Bonus Test

Once per week:

1. Review monthly streak and overall streak.
2. Edit bonus rules as admin.
3. Award an eligible bonus.
4. Confirm separate 5-day, 7-day, 30-day, and super-bonus milestones do not block each other.
5. Sign in as a child and Vanessa to confirm they cannot edit fine rates, bonus rates, pay rates, or award/charge money.
6. Confirm the chore account balance changes only once per awarded milestone.
7. Export a backup after bonus changes.

## Vanessa Helper Test

Each helper workday:

1. Save arrival and exit time.
2. Confirm weekly hours and paycheck update.
3. Confirm a new week starts a new pay record.
4. Sign in as Vanessa and confirm she can save time, reorder priorities, and request ingredients.
5. Confirm Vanessa cannot edit her hourly rate.
6. Change the hourly rate once as Brigham or Karmel to confirm it works.
7. Drag tasks into priority order.
8. Refresh the page and confirm task order stayed saved.
9. Add ingredient requests.

## Backup And Device Test

Once per week:

1. Export Backup from Beta Data Tools.
2. Save the file privately.
3. Import the backup in another browser or device.
4. Confirm the import warning appears before replacing local beta data.
5. Confirm chores, the family photo, child photos, helper tasks, fines, bonuses, and settings restore.
6. Reset test data only after exporting a backup, and confirm the family photo, child photos, and Gmail links are cleared with the rest of the local beta data.
7. Check the local beta data summary counts for chore records, finalized reviews, extensions, helper pay weeks, ingredient requests, family photo, child photos, Gmail links, and last export/import/reset timestamps.
8. After a new GitHub/Netlify publish, reload the installed web app and confirm the latest dashboard changes appear while offline fallback still opens when the network is unavailable.

## Known Prototype Limits

- Data is saved in the browser during beta, not in a shared cloud database.
- Google login is a Gmail-linking prototype until Google Identity Services and backend token verification are connected.
- Text reminders are queued as prototype messages; real SMS requires a notification service.
- Photo proof is stored locally in browser data and backups.
- Walmart opens externally; direct cart integration requires a secure approved integration.

## What To Track

Use the in-app Beta Feedback Log or a shared note to record:

- Missing chores
- Chores with wrong difficulty
- Chores that take longer than estimated
- Schedule, notice timing, or approved-for fit surprises
- Confusing wording
- Any fine or bonus disagreement
- Whether the 30-day forecast feels fair
- Whether kids understand the dashboard without parent explanation

## Beta Feedback Log

Use the in-app feedback log whenever something feels off. Choose a category, severity, person, and short note. Anyone can add feedback, but only Brigham or Karmel should mark items resolved after the family agrees the issue is fixed or no longer important.

## Ready For Production When

- The family completes 2-4 weeks with stable rules.
- Chore assignments feel fair.
- Fines and bonuses match family expectations.
- Parents trust the noon review workflow.
- Vanessa’s helper section reflects real work patterns.
- The family knows which notifications need to be real SMS or push.
