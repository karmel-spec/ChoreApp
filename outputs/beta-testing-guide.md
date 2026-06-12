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
4. Try one invalid rule time and one invalid text number, then confirm the app blocks saving until both are valid.
5. Save Family Rule Settings once and confirm the panel shows who saved the rules and when.
6. Add or adjust child profile photos as Brigham or Karmel, including confirming the home page photo tools stay locked for non-admin sessions.
7. Try a non-image or oversized photo and confirm the app asks for an image under 2 MB.
8. If a photo file fails to read, confirm the app shows a clear try-again message instead of hanging.
9. Export a backup before making major changes.

## Daily Child Test

Each child should test:

1. Sign in with their profile.
2. Confirm their daily priority chores appear first.
3. Try opening another child’s direct dashboard link and confirm the app returns them to their own dashboard.
4. Complete priority chores.
5. Use Undo before parent review and confirm the chore returns to incomplete.
6. Complete rotating chores.
7. Add at least one photo proof during the week and confirm photo-first proof marks the chore ready for review.
8. Try a non-image or oversized proof photo and confirm the app blocks it before saving.
9. Check the 7-day view and notice whether future assignments look understandable.
10. Watch for celebration messages and whether they feel age-appropriate.

## Parent Noon Review Test

Each day, Brigham or Karmel should test:

1. Send the noon review text cue.
2. On a phone, confirm the cue opens a text draft to Mom Karmel at 801-427-9293.
3. Confirm the Noon Review panel logs Mom Karmel's number, the selected child, who queued it, and the time.
4. Confirm only today’s noon reminder cues appear in the daily review panel.
5. Physically inspect chores.
6. Approve completed chores.
7. Send one chore back for redo during beta to test the loop.
8. Have the child tap Redo Done and confirm it returns to waiting for inspection.
9. Finalize the selected child or all children.
10. Confirm missed rotating chores charge a fine only once for the day.
11. Try Charge Missed Deadline Fine twice for the same child and confirm the second click is blocked for that day.
12. Confirm the fine ledger shows the actual missed deadline, including any Brigham-approved extension time.
13. Confirm fine rows show who charged the fine, when it was charged, and who marked it paid.
14. Confirm finalized chores lock against late edits.
15. Mark a fine paid and confirm the open fine total changes.

## Extension Test

Once during beta:

1. Sign in as a child and confirm Text Extension Request opens a text draft to Brigham at 801-830-0011.
2. Sign in as Karmel and confirm extension approval is locked.
3. Sign in as Brigham and approve or deny an extension.
4. Try an invalid extension time and confirm Brigham cannot save it until the time is valid.
5. Confirm the Extension Petition panel logs the request and Brigham's approval or denial.
6. Confirm the selected child’s rotating chore deadline changes only when Brigham approves.

## Admin Rotation Test

At least twice per week:

1. Toggle chores on and off in the master chore list.
2. Add one new chore with schedule, minutes, difficulty, and approved-for settings.
3. Try invalid minutes and invalid difficulty, then confirm the app blocks the new chore until both are valid.
4. Confirm master chore rows show who added or last changed rotation settings and when.
5. Confirm non-admin logins cannot edit the master chore list.
6. Add or temporarily edit one over-30-minute chore and confirm it does not appear in a child’s rotating assignment.
7. Use Shuffle Preview.
8. Check the 30-day forecast for one younger child and one older child.
9. Confirm schedule, notice timing, approved-for fit, and difficulty rules look right.
10. Check 30-Day Fairness and note if one child seems overloaded.

## Bonus Test

Once per week:

1. Review monthly streak and overall streak.
2. Edit bonus rules as admin.
3. Try one invalid bonus amount and one invalid fine amount, then confirm the app blocks saving until both are valid.
4. Award an eligible bonus.
5. Confirm separate 5-day, 7-day, 30-day, and super-bonus milestones do not block each other.
6. Confirm bonus rows show who awarded the money and when it was awarded.
7. Sign in as a child and Vanessa to confirm they cannot edit fine rates, bonus rates, pay rates, or award/charge money.
8. Confirm the chore account balance changes only once per awarded milestone.
9. Export a backup after bonus changes.

## Vanessa Helper Test

Each helper workday:

1. Save arrival and exit time.
2. Confirm weekly hours, paycheck, and the shift entry audit update.
3. Confirm a new week starts a new pay record.
4. Sign in as Vanessa and confirm she can save time, reorder priorities, and request ingredients.
5. Confirm Vanessa can view child dashboards but cannot mark child chores complete or add proof photos.
6. Confirm Vanessa cannot edit her hourly rate.
7. Change the hourly rate once as Brigham or Karmel to confirm it works.
8. Try an invalid hourly rate and confirm the app blocks saving the time card until the rate is valid.
9. Mark a helper pay week paid as Brigham or Karmel and confirm paid-by audit details appear.
10. Drag tasks into priority order, then use the up/down controls to confirm priority order also works on mobile.
11. Refresh the page and confirm task order stayed saved.
12. Add ingredient requests and mark one purchased as Brigham or Karmel.

## Backup And Device Test

Once per week:

1. Export Backup from Beta Data Tools.
2. Confirm the export status lists who exported it and the backup contents summary.
3. Save the file privately.
4. Select the backup file and confirm the preview shows exported date, exported by, and key counts before importing.
5. If a backup file cannot be read, confirm the app shows a clear try-again message.
6. Import the backup in another browser or device.
7. Confirm the import warning appears before replacing local beta data.
8. Confirm chores, chore minutes/difficulty, chore checkbox, proof photo, redo, and approval statuses, the family photo, child photos, helper task priority lists and ingredient request names, helper pay records, child account totals, bonus rules, fine and bonus ledger amounts/dates, finalized review records, extension deadlines, extension audit logs, review reminder logs, feedback notes and resolved status, fines, bonuses, and settings restore.
9. Reset test data only after exporting a backup, and confirm the family photo, child photos, and Gmail links are cleared with the rest of the local beta data.
10. Check the local beta data summary counts for chore records, finalized reviews, extensions, extension audit events, review reminder cues, helper pay weeks, ingredient requests, family photo, child photos, Gmail links, and last export/import/reset timestamps.
11. After a new GitHub/Netlify publish, reload the installed web app and confirm the latest dashboard changes appear while offline fallback still opens when the network is unavailable.

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
