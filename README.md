# Teamwork Chores

Responsive static prototype for the family chore dashboard.

## Local Preview

```bash
npm run build
npm run dev
```

Open `http://localhost:4174`.

## Netlify Setup

This repo is ready for Netlify static hosting.

Netlify configuration lives in `netlify.toml`:

- Build command: `npm run build`
- Publish directory: `outputs`
- App route: `/app`
- Design route: `/designs`

## GitHub to Netlify Publish Loop

The GitHub Actions workflow at `.github/workflows/deploy-netlify.yml` deploys to Netlify whenever code is pushed to `main`.

Required GitHub repository secrets:

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Loop:

```bash
git add .
git commit -m "Update chore dashboard"
git push origin main
```

GitHub Actions verifies the static site and deploys `outputs/` to Netlify.

## Website Beta Testing

Use `outputs/beta-testing-guide.md` for the family beta script. It covers daily child testing, parent noon review, Brigham-only extension approval, admin chore rotation and fit checks, bonuses, Vanessa helper role and pay workflows, backups, local data restore checks, known prototype limits, and production-readiness signals.

## Phase Two Gate

Use `outputs/chore-app-phase-plan.md` before app-store prep. Move past website beta only after 2-4 weeks of stable family testing, no blocking beta feedback, verified backup/restore, and agreement on production needs: secure backend storage, real Google login, server-side roles, notifications, hosted photo storage, audit history, privacy policy, and support contact.

## Google Login Setup

The prototype now includes a Gmail-linked login flow for every family member. It stores the linked Gmail in the browser for demo purposes.

For production Google login:

- Create a Google OAuth Client ID for a web application.
- Add authorized JavaScript origins for local preview and the deployed Netlify URL, such as `http://localhost:4174` and your Netlify site origin.
- Add the Google Identity Services client to the app and replace the prototype button with a real sign-in callback.
- Verify Google ID tokens on a backend before trusting role access, admin permissions, fines, payments, or child data.
- Store the Google Client ID as deployment configuration instead of hard-coding secrets in the static app.

Reference: https://developers.google.com/identity/gsi/web/guides/overview

## Privacy Note

The current prototype contains real names and a phone number. Use a private GitHub repo and Netlify team access, or sanitize the app before making it public.
