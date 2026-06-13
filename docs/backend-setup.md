# Teamwork Chores Backend Setup

This is the production path that keeps the parent admin dashboard simple while moving real data out of browser storage.

## Recommended Stack

- Supabase Postgres for family data
- Supabase Auth with Google sign-in
- Supabase Storage for family hero, profile, chore proof, and feed photos
- Netlify Functions for trusted server actions
- Twilio for SMS reminders and extension/review alerts

Parents still use the Teamwork Chores admin dashboard. Supabase is the quiet backend, not a second dashboard parents need to manage day to day.

## Environment Variables

Copy `.env.example` into Netlify environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_MESSAGING_SERVICE_SID`
- `WEB_PUSH_VAPID_PUBLIC_KEY`
- `WEB_PUSH_VAPID_PRIVATE_KEY`
- `WEB_PUSH_SUBJECT`
- `TEAMWORK_CHORES_SITE_URL`
- `KARMEL_NOON_REVIEW_PHONE`
- `BRIGHAM_EXTENSION_PHONE`

Never expose `SUPABASE_SERVICE_ROLE_KEY` or Twilio secrets in browser JavaScript.

## Setup Order

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Update Gmail placeholders in `supabase/seed-teamwork-chores.sql`, then run it in the Supabase SQL editor.
4. Confirm the private Supabase Storage bucket named `family-photos` exists.
5. Enable Google provider in Supabase Auth.
6. Add the Google OAuth redirect URL for the Netlify domain.
7. Add the environment variables in Netlify.
8. Deploy the Netlify Functions in `netlify/functions`.
9. Sign in once with each Gmail so `link-google-member` can connect Supabase Auth users to family member rows.
10. Use Production Backend Readiness in the app until `backend-health` reports `readyForWorkflowBeta: true`.

## Netlify Function Contracts

- `backend-health`: checks production readiness for environment variables, Supabase tables, expected family member mapping, Google auth links, Supabase Storage, notification logging, and Twilio configuration.
- `link-google-member`: verifies the signed-in Google email and links the Supabase Auth user to the matching `family_members.gmail` record.
- `runtime-config`: returns public Supabase and Google client configuration for the browser.
- `auth-google`: verifies a Supabase Auth bearer token and returns the linked family member.
- `family-snapshot`: lets signed-in family members reload family member contact settings, work targets, fine rates, and signed family/profile photo URLs from Supabase.
- `chore-record`: lets signed-in family members reload chore completion/review records, lets a child/admin mark that child's chore complete or reopened, and lets only parent admins approve or send chores back for redo.
- `family-settings`: lets parent admins save default deadline, noon review reminder time, extension approver/contact, and review recipient/contact.
- `chore-library`: lets signed-in family members read the master chore rotation, and lets parent admins add, update, toggle, and delete items with difficulty, timing, frequency, fit, notice, and training notes.
- `member-contact`: lets admins update any child phone/text opt-in and lets children update only their own setting.
- `money-ledger`: lets signed-in family members read child ledger/account history, and requires a verified parent admin token plus the `CONFIRM MONEY` guardrail before charging fines, awarding bonuses, or marking fines paid.
- `photo-upload-url`: creates a private Supabase Storage signed upload URL for family photos.
- `photo-record`: records or clears uploaded family hero, profile, proof, and feed photos in Supabase with role checks.
- `send-sms`: lets parent admins send trusted Twilio SMS reminders and logs each send.
- `teen-reminder`: lets parent admins send opted-in child chore reminder or redo texts and logs each send.
- `push-subscription`: lets signed-in members save or disable their own browser push subscription, while parent admins can manage family member subscriptions.
- `send-push`: lets parent admins send Web Push reminders to opted-in members with active browser subscriptions.
- `extension-request`: lets signed-in family members reload extension requests, and lets a child or admin create an extension petition and text Brigham.
- `extension-decision`: lets only Brigham approve or deny an extension, save the final approved deadline, and optionally text the child.
- `scheduled-noon-review`: sends Mom Karmel the noon review reminder through Twilio and prevents duplicate same-day sends.
- `scheduled-teen-reminders`: sends a once-daily morning chore reminder to opted-in children with saved cell numbers and prevents duplicate same-day sends.

## Server-Side Permissions

The browser prototype currently hides admin controls in the UI. Production must enforce these rules on the server:

- Only Brigham and Karmel can change chore library, fine rates, bonus rates, ledgers, availability holds, and helper pay.
- Children can update their own chore completion, own profile photo, and own phone/text consent.
- Vanessa can update helper tasks, helper time, and ingredient requests.
- Brigham is the extension approver.
- All money-changing actions must be audited.

The `supabase/schema.sql` file includes initial row-level security policies for those boundaries.

The `money-ledger` function is the production money gate and the reload source for child account panels. Browser confirmation remains a user-facing speed bump, but the backend function is the authority: it rejects children/helpers for money changes, requires the exact `CONFIRM MONEY` confirmation text, blocks duplicate same-day fine titles and duplicate bonus-period awards, records who charged, awarded, or marked a fine paid, and lets signed-in family members read the resulting ledger history.

The `chore-record` function is the production chore-completion gate and reload source for checkbox/review state. Children can complete or reopen only their own chores, parent admins can manage any child, and only parent admins can approve inspected chores or send them back for redo. Proof photos attach to these server chore records through `photo-record`.

The `family-settings` and `chore-library` functions move parent admin controls out of browser-only trust. Children and helpers can read the resulting `family_settings` rules and chore assignments after Google sign-in, but only Brigham or Karmel can change deadlines, text contacts, chore rotation rows, training notes, difficulty, timing, or active/inactive status.

The `family-snapshot` function is the production reload path for profile photos, family hero photos, child phone/text opt-in settings, work targets, fine rates, and account basics. It returns short-lived signed Supabase Storage URLs for the private `family-photos` bucket, so family photos can reload in the app without making the bucket public.

## Family Seed Data

`supabase/seed-teamwork-chores.sql` creates:

- One Teamwork Chores family row
- Brigham and Karmel admin profiles
- Vanessa helper profile
- Thayne, Brig Jr., Josh, JoJo, Louis, and Brielle child profiles
- Default work-minute targets, fine rates, difficulty approvals, and zero account balances
- Default family rule settings for 12:00 PM deadlines, Karmel noon review texts, and Brigham extension approvals
- Notification preference rows for every family member
- Push subscription storage through `push_subscriptions`
- The private `family-photos` storage bucket and authenticated storage policies
- Starter chore library rows, including cooking/food prep chores and inactive harder one-off chores

Before production, replace every `null` Gmail in the seed with that person’s real Gmail. The first Google sign-in for each invited Gmail will call `link-google-member` and store the Supabase `auth_user_id` on the matching family member.

## SMS / Push Notifications

Phase-one SMS should use Twilio through Netlify Functions:

- Noon review text to Karmel
- Extension request/approval texts to Brigham and the child when opted in
- Redo request texts to opted-in teens
- Optional teen reminder texts for unfinished chores

The current scheduled functions are `scheduled-noon-review` with the cron expression `0 18 * * *`, which is noon Mountain Daylight Time, and `scheduled-teen-reminders` with `0 15 * * *`, which is 9:00 AM Mountain Daylight Time. If the family wants exact local times through daylight-saving changes, configure a timezone-aware scheduler or adjust the cron seasonally.

Push notifications use browser Web Push with VAPID keys. A child or parent admin can enable push from the child dashboard on each device after Google sign-in. Parent admins can then use `send-push` for trusted reminders; each send is logged in `notification_log`.

## Photo Storage

Use Supabase Storage bucket `family-photos` with paths like:

- `family/{family_id}/hero/current.jpg`
- `family/{family_id}/profiles/{member_id}.jpg`
- `family/{family_id}/proof/{service_date}/{chore_record_id}.jpg`
- `family/{family_id}/feed/{photo_id}.jpg`

Photos should be private family content. The app should load them through signed URLs or authenticated storage rules.

## Web Beta Ready Gate

The web beta is ready to prove the workflow when:

- Supabase tables and RLS are live.
- Google login maps each Gmail to exactly one family member.
- Admin actions are rejected server-side for child/helper users.
- Photos upload to Supabase Storage.
- SMS reminders can be sent through Twilio from Netlify Functions.
- `backend-health` reports `readyForWorkflowBeta: true` on the deployed site.
- The beta guide passes on the deployed site, not only localhost.
