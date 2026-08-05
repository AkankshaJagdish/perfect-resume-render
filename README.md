# PerfectResume Render Deployment Guide

PerfectResume is an OpenSaaS/Wasp application for uploading resumes, analyzing them against a target job description, extracting ATS keywords with Gemini, spending credits, and generating a tailored LaTeX PDF resume. This repository keeps the standard OpenSaaS split between the Wasp app in `app/`, a static web client, a Node server, Prisma/PostgreSQL, and the Render blueprint in `render.yaml`.

## Local Development

### Prerequisites

1. Node.js 24 (matches the Render blueprint).
2. npm.
3. Wasp CLI `0.24.x`.
4. PostgreSQL, either via `wasp start db` or your own local database.
5. A TeX distribution with `pdflatex` available on `PATH` for resume PDF generation.
6. API credentials for Google OAuth, Dodo Payments, Gemini, SMTP email, AWS S3, and Plausible if you want to exercise every integration locally.

### Install and run

```sh
cd app
cp .env.server.example .env.server
cp .env.client.example .env.client
npm install
wasp install
wasp start db
wasp db migrate-dev
wasp start
```

If you use an external local Postgres database instead of `wasp start db`, set `DATABASE_URL` in `app/.env.server` before running migrations.

## Environment Variables

The Render blueprint and app env validation are aligned around the active PerfectResume integrations below.

### Server variables

| Variable                                | Required | Used for                                                                                                                                                      |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                          | Yes      | Prisma/PostgreSQL connection. Render wires this from `perfectresume-db`.                                                                                      |
| `JWT_SECRET`                            | Yes      | Wasp auth/session signing. Render generates this automatically.                                                                                               |
| `WASP_SERVER_URL`                       | Yes      | Public server URL used by Wasp. Render wires this from the server service URL.                                                                                |
| `WASP_WEB_CLIENT_URL`                   | Yes      | Public client URL used by Wasp auth redirects and links. Render wires this from the client service URL.                                                       |
| `ADMIN_EMAILS`                          | Optional | Comma-separated emails promoted to admin on signup.                                                                                                           |
| `GOOGLE_CLIENT_ID`                      | Yes      | Google OAuth client ID.                                                                                                                                       |
| `GOOGLE_CLIENT_SECRET`                  | Yes      | Google OAuth client secret.                                                                                                                                   |
| `SMTP_HOST`                             | Yes      | SMTP host for Wasp email auth verification/reset emails.                                                                                                      |
| `SMTP_USERNAME`                         | Yes      | SMTP username.                                                                                                                                                |
| `SMTP_PASSWORD`                         | Yes      | SMTP password.                                                                                                                                                |
| `SMTP_PORT`                             | Yes      | SMTP port, commonly `587`.                                                                                                                                    |
| `DODO_PAYMENTS_API_KEY`                 | Yes      | Dodo Payments API key for checkout and customer portal calls.                                                                                                 |
| `DODO_PAYMENTS_WEBHOOK_KEY`             | Yes      | Dodo webhook signing key for `/payments-webhook`.                                                                                                             |
| `DODO_PAYMENTS_ENVIRONMENT`             | Yes      | `test_mode` locally or `live_mode` in production.                                                                                                             |
| `PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID` | Yes      | Dodo product/plan ID mapped to the PerfectResume starter subscription.                                                                                        |
| `GEMINI_API_KEY`                        | Yes\*    | Gemini key for resume optimization.                                                                                                                           |
| `GEMINI_API_KEYS`                       | Yes\*    | Optional comma-separated fallback keys. Set either this or `GEMINI_API_KEY`; use the Render dashboard if you prefer this over the single-key blueprint entry. |
| `AWS_S3_IAM_ACCESS_KEY`                 | Yes      | S3 access key for file uploads.                                                                                                                               |
| `AWS_S3_IAM_SECRET_KEY`                 | Yes      | S3 secret key for file uploads.                                                                                                                               |
| `AWS_S3_FILES_BUCKET`                   | Yes      | S3 bucket for uploaded files.                                                                                                                                 |
| `AWS_S3_REGION`                         | Yes      | S3 bucket region.                                                                                                                                             |
| `PLAUSIBLE_API_KEY`                     | Yes      | Plausible API key for admin daily stats.                                                                                                                      |
| `PLAUSIBLE_SITE_ID`                     | Yes      | Plausible site ID/domain.                                                                                                                                     |
| `PLAUSIBLE_BASE_URL`                    | Yes      | Plausible API base URL, usually `https://plausible.io/api`.                                                                                                   |
| `NODE_VERSION`                          | Yes      | Render Node runtime version. Set to `24` in `render.yaml`.                                                                                                    |
| `WASP_TELEMETRY_CONTEXT`                | No       | Render deployment telemetry label.                                                                                                                            |

\* Set at least one of `GEMINI_API_KEY` or `GEMINI_API_KEYS`.

### Client variables

| Variable                        | Required | Used for                                                                                                |
| ------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `REACT_APP_API_URL`             | Yes      | Public server URL embedded into the static client build. Render wires this from the server service URL. |
| `REACT_APP_GOOGLE_ANALYTICS_ID` | Optional | Enables Google Analytics after cookie consent. Leave empty if not used.                                 |

## Render Deployment

1. Push this repository to GitHub/GitLab.
2. In Render, create a new **Blueprint** and select this repository.
3. Confirm Render detects `render.yaml` at the repository root.
4. Let the blueprint create:
   - `perfectresume-db` PostgreSQL database,
   - `perfectresume-server` Node web service,
   - `perfectresume-client` static site.
5. In the Render dashboard, fill every `sync: false` secret on the server and client services before the final production deploy.
6. After Render assigns public URLs, verify these automatically wired values:
   - `WASP_SERVER_URL` is the `perfectresume-server` URL,
   - `WASP_WEB_CLIENT_URL` is the `perfectresume-client` URL,
   - client `REACT_APP_API_URL` is the `perfectresume-server` URL.
7. Run database migrations from a Render server shell after the build succeeds:

```sh
cd app/.wasp/out/server
npx prisma migrate deploy --schema=../db/schema.prisma
```

8. Verify the deployment:
   - open the client URL,
   - sign up or sign in with Google,
   - upload a PDF/DOCX/TXT resume,
   - generate a resume with Gemini,
   - download the PDF,
   - start a Dodo checkout,
   - confirm `/payments-webhook` receives Dodo events.

### Runtime prerequisite: `pdflatex`

PerfectResume uses LaTeX PDF generation from a Wasp background job, so the Render server runtime must have `pdflatex` and the LaTeX packages used by `app/src/resume/resume.tex`. The server `buildCommand` in `render.yaml` installs the smallest compatible TeX Live set needed by the template: `texlive-latex-base`, `texlive-latex-recommended`, `texlive-latex-extra`, and `texlive-fonts-recommended`. These packages provide `pdflatex` plus template dependencies such as `fullpage`, `titlesec`, `marvosym`, `enumitem`, `hyperref`, `fancyhdr`, `babel`, `tabularx`, and `glyphtounicode`.

After deployment, verify the runtime from a Render server shell with:

```sh
which pdflatex
pdflatex --version
```

## Dodo Payments Setup

1. Create production Dodo products/subscriptions.
2. Set `PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID` to the Dodo product ID used by the starter subscription.
3. Set `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_ENVIRONMENT=live_mode` on Render.
4. Create a Dodo webhook pointing to:

```text
https://<perfectresume-server>.onrender.com/payments-webhook
```

5. Copy the webhook signing key into `DODO_PAYMENTS_WEBHOOK_KEY`.
6. Test a checkout and confirm the user's subscription/credits update.

## Gemini Setup

1. Create a Gemini API key in Google AI Studio or your Google Cloud setup.
2. Set `GEMINI_API_KEY` for one key, or `GEMINI_API_KEYS` for comma-separated failover keys.
3. Redeploy the server after changing Gemini secrets.
4. Test the resume optimizer with a small TXT/PDF upload and a short job description.

## Google OAuth Setup

1. Create OAuth credentials in Google Cloud Console.
2. Add the deployed client URL to authorized JavaScript origins.
3. Add the Wasp Google callback URL to authorized redirect URIs. It uses the server URL and Wasp's Google auth callback path.
4. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on the Render server service.
5. Redeploy and test Google sign-in from the client URL.

## Troubleshooting

- **Missing Gemini key:** server startup or resume generation fails with a Gemini env error. Set `GEMINI_API_KEY` or `GEMINI_API_KEYS`.
- **Missing `pdflatex`:** resume optimization will fail in the background job during PDF generation. Confirm the server build installed the TeX Live packages in `render.yaml`, then run `which pdflatex` and `pdflatex --version` from a Render server shell.
- **Dodo webhook failures:** confirm the Dodo endpoint is `/payments-webhook`, `DODO_PAYMENTS_WEBHOOK_KEY` matches the webhook, and `DODO_PAYMENTS_ENVIRONMENT` matches test vs live mode.
- **Google OAuth redirect mismatch:** update Google Cloud authorized origins/redirect URIs after Render URLs change.
- **Email verification/reset failures:** verify `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_PORT`; some hosting/network plans block outbound SMTP ports.
- **Database connection issues:** confirm `DATABASE_URL` is wired from `perfectresume-db` and run `npx prisma migrate deploy --schema=../db/schema.prisma` from the built server directory.
- **Client cannot reach API:** ensure `REACT_APP_API_URL` was set before the static client build and points to `perfectresume-server`.
- **Analytics job errors:** verify `PLAUSIBLE_API_KEY`, `PLAUSIBLE_SITE_ID`, and `PLAUSIBLE_BASE_URL`.
