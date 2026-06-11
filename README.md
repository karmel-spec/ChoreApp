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

## Privacy Note

The current prototype contains real names and a phone number. Use a private GitHub repo and Netlify team access, or sanitize the app before making it public.
