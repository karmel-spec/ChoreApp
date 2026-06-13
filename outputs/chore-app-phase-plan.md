# Family Chore App Phase Plan

## Phase 1: Web App

Build this first as a responsive web app that works well on phones, tablets, and a shared family computer.

Core web app features:
- Family dashboards for Thayne, Brig Jr., Josh, JoJo, Louis, and Brielle
- Login profiles for Brigham, Karmel, Vanessa, and each child, with role-based access
- Gmail-linked login for every family member, upgraded to Google Identity Services sign-in for production
- Daily view, rolling 7-day view, and 30-day forecast preview
- Daily priority chores due before rotating fined chores
- Randomized rotating chore assignments
- Chore difficulty ratings and estimated minutes
- Under-30-minute daily rotating workload per child
- All-time streak winners podium for first, second, and third place
- Admin chore library with on/off rotation toggles
- Admin chore intake for daily, Monday-only, weekly, monthly, and one-off chores
- 24-hour notice before new chores enter rotation
- Home hub with family photo, rotating inspirational thoughts, and a good-news feed for streaks, bonuses, and teamwork wins
- Child photo entry buttons below the family photo that open each child’s dashboard and chore list directly
- Family and child photos displayed on the home hub, with editing kept in the backend admin dashboard
- Completion checkbox plus optional photo proof
- Noon text reminder for Mom to physically inspect chores
- Child cell phone and opt-in settings for teen chore/reminder texts
- Fine ledger with paid/unpaid tracking
- Editable per-child daily fine rates for missed 12:00 PM deadlines
- Extension petition flow where only Brigham-dad can approve deadline changes by text
- Chore account balances for each child
- Admin-editable streak bonus awards such as 5-day, 7-day, and 30-day monthly bonuses
- Fine rates, bonus rates, and child profile photos editable only by Brigham and Karmel admin accounts
- Editable child profile images shown on dashboards, family list, and chore tracker rows
- Age-aware celebration responses when chores are marked complete, including sticker-style, game-style, teen, and mindful gratitude feedback
- Monthly bonus streaks that restart on the first of each month while overall streaks continue
- Long-term super bonuses for larger overall streak milestones
- In-app beta readiness checklist that separates ready-to-test website features from production backend and app-store requirements
- Production backend scaffold for Supabase database, Google auth verification, photo storage, SMS functions, and server-side role policies

Recommended web stack:
- Responsive PWA-style web app
- Shared database for family data
- Parent admin roles for Brigham and Karmel
- Child role for each family member
- Helper role for Vanessa
- Scheduled jobs for noon reminders, fines, and rotation generation
- Photo upload storage for completion proof

Phase 1 should be installable to the phone home screen as a web app before investing in native app-store packaging.

Use `beta-testing-guide.md` during the website beta to test daily chores, parent review, fines, bonuses, Vanessa helper workflows, backups, and known prototype limits.

## Production Web App Gate

Move from website beta to production web app work when the family has completed 2-4 weeks of testing and agrees that:

- Daily priority chores are understood without parent explanation.
- Rotating chores feel fair across the 7-day view and 30-day forecast.
- Brigham-only extension approval is clear and rare enough to manage.
- Parent review, redo, finalization, fines, and paid-fine tracking match family expectations.
- Monthly bonuses and long-term super bonuses are motivating without causing disputes.
- Vanessa’s helper time card, pay record, priority board, and ingredient requests match real work patterns.
- The beta feedback log has no unresolved blocking issues.
- Export/import backup has been tested on another device.

Production web app requirements:

- Secure cloud database for family, chore, review, fine, bonus, helper, and feedback records
- Real Google Identity Services login with backend token verification
- Role-based authorization enforced on the backend, not only in the browser
- Scheduled notification service for noon review reminders, extensions, and overdue prompts
- Durable photo proof storage with privacy controls and retention rules
- Supabase Storage-backed family hero, child profile, proof, and feed photo records
- Twilio-backed SMS functions for parent alerts and opted-in teen reminders
- Child phone-number and reminder-consent records tied to each authenticated user
- Audit history for parent review, fines, bonus awards, extension approvals, and helper pay edits
- Device-safe backup/export policy for family records
- Environment-based configuration for secrets, OAuth client IDs, SMS/push providers, and storage
- Privacy policy and support contact before broader distribution

## Phase 2: App Store Preparation

Package the web app for iOS and Android once the family workflow feels right.

Best path:
- Keep one shared web codebase
- Wrap it with a mobile shell using Capacitor or React Native WebView-style packaging
- Add push notifications for reminders, extensions, and review prompts
- Add camera/photo upload permissions
- Add app icons, splash screens, screenshots, and store descriptions
- Add privacy policy and support URL
- Add demo account or demo mode for app review

App review readiness:
- Test for crashes and bugs
- Make app metadata accurate
- Keep backend services live during review
- Provide reviewer access to account-based features
- Avoid collecting unnecessary child data
- Treat photos as private family content
- Keep text/photo submissions limited to the family group
- Include parent/admin controls and support contact info

Important app-store notes:
- Apple states apps should be tested for crashes and bugs, metadata should be complete and accurate, backend services should be live, and reviewers need full access to account-based features.
- Apple also notes that if the app is only for family and friends, App Store distribution may not be the best path; TestFlight, Ad Hoc, or a web app may be better depending on the audience.
- Google Play setup requires app details, contact email, declarations, store listing information, app bundles, testing/release tracks, and review/rollout steps.

## Suggested Build Order

1. Turn the prototype into a real web app with saved data.
2. Add user accounts, roles, and permissions.
3. Connect real Google login with Google Identity Services and a backend token check.
4. Add the scheduling engine for rotations and 7-day previews.
5. Add photo proof upload and inspection approval.
6. Add SMS/push notification reminders.
7. Add fines and payment tracking.
8. Run the family on the web app for 2-4 weeks.
9. Resolve all blocking beta feedback and document privacy/support policies.
10. Package for iOS/Android only after the workflow is stable.
