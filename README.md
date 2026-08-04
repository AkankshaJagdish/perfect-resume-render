# PerfectResume Render Deployment Guide

PerfectResume is an OpenSaaS/Wasp application for uploading resumes, analyzing them against a target job description, extracting ATS keywords with Gemini, spending credits, and generating a tailored LaTeX PDF resume. This repository keeps the standard OpenSaaS split between the Wasp app in `app/`, a static web client, a Node server, Prisma/PostgreSQL, and the Render blueprint in `render.yaml`.

## Infrastructure Audit Summary

PerfectResume does not require persistent object storage for its core product workflow. Resume files are accepted by the resume optimizer API with Multer memory storage, parsed from the in-memory buffer, optimized with Gemini, compiled to PDF, returned to the browser as Base64, and then discarded. The database stores only metadata such as generation status, timestamps, input file name, credits, and ATS score.

The inherited OpenSaaS sample persistent file-upload page and storage code have been removed. No external object-storage replacement is required because uploaded resumes and generated PDFs are not persisted. Google Analytics is the only analytics provider.

## Local Development

### Prerequisites

1. Node.js 24 (matches the Render blueprint).
2. npm.
3. Wasp CLI `0.24.x`.
4. PostgreSQL, either via `wasp start db` or your own local database.
5. A TeX distribution with `pdflatex` available on `PATH` for resume PDF generation.
6. API credentials for Google OAuth, Dodo Payments, Gemini, SMTP email, and Google Analytics if you want to exercise every integration locally.

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

| Variable | Required | Used for |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Prisma/PostgreSQL connection. Render wires this from `perfectresume-db`. |
| `JWT_SECRET` | Yes | Wasp auth/session signing. Render generates this automatically. |
| `WASP_SERVER_URL` | Yes | Public server URL used by Wasp. Render wires this from the server service URL. |
| `WASP_WEB_CLIENT_URL` | Yes | Public client URL used by Wasp auth redirects and links. Render wires this from the client service URL. |
| `ADMIN_EMAILS` | Optional | Comma-separated emails promoted to admin on signup. |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret. |
| `SMTP_HOST` | Yes | SMTP host for Wasp email auth verification/reset emails. |
| `SMTP_USERNAME` | Yes | SMTP username. |
| `SMTP_PASSWORD` | Yes | SMTP password. |
| `SMTP_PORT` | Yes | SMTP port, commonly `587`. |
| `DODO_PAYMENTS_API_KEY` | Yes | Dodo Payments API key for checkout and customer portal calls. |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Yes | Dodo webhook signing key for `/payments-webhook`. |
| `DODO_PAYMENTS_ENVIRONMENT` | Yes | `test_mode` locally or `live_mode` in production. |
| `PAYMENTS_STARTER_SUBSCRIPTION_PLAN_ID` | Yes | Dodo product/plan ID mapped to the PerfectResume starter subscription. |
| `GEMINI_API_KEY` | Yes* | Gemini key for resume optimization. |
| `GEMINI_API_KEYS` | Yes* | Optional comma-separated fallback keys. Set either this or `GEMINI_API_KEY`; use the Render dashboard if you prefer this over the single-key blueprint entry. |
| `GOOGLE_ANALYTICS_CLIENT_EMAIL` | Yes | Google Analytics Data API service account email for admin stats. |
| `GOOGLE_ANALYTICS_PRIVATE_KEY` | Yes | Base64-encoded service account private key for Google Analytics Data API. |
| `GOOGLE_ANALYTICS_PROPERTY_ID` | Yes | GA4 property ID for admin stats. |
| `NODE_VERSION` | Yes | Render Node runtime version. Set to `24` in `render.yaml`. |
| `WASP_TELEMETRY_CONTEXT` | No | Render deployment telemetry label. |

\* Set at least one of `GEMINI_API_KEY` or `GEMINI_API_KEYS`.

### Client variables

| Variable | Required | Used for |
| --- | --- | --- |
| `REACT_APP_API_URL` | Yes | Public server URL embedded into the static client build. Render wires this from the server service URL. |
| `REACT_APP_GOOGLE_ANALYTICS_ID` | Yes | Enables Google Analytics after cookie consent. |

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
   - upload a PDF/DOCX/TXT resume through the resume optimizer,
   - generate a resume with Gemini,
   - download the returned PDF,
   - confirm no uploaded resume or generated PDF is persisted after the request,
   - start a Dodo checkout,
   - confirm `/payments-webhook` receives Dodo events.

### Runtime prerequisite: `pdflatex`

PerfectResume uses LaTeX PDF generation. The Render server runtime must have `pdflatex` available. If the default Node environment does not include it, switch the server service to a Docker-based Render service or add an approved build/runtime step that installs a TeX distribution before starting the server.

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

## Google Analytics Setup

1. Create or select a GA4 property.
2. Set `REACT_APP_GOOGLE_ANALYTICS_ID` to the GA measurement ID for client-side analytics.
3. Enable the Google Analytics Data API for the Google Cloud project used for admin stats.
4. Create a service account with viewer access to the GA4 property.
5. Set `GOOGLE_ANALYTICS_CLIENT_EMAIL`, base64-encoded `GOOGLE_ANALYTICS_PRIVATE_KEY`, and `GOOGLE_ANALYTICS_PROPERTY_ID` on the Render server service.

## Storage Model

PerfectResume uses temporary in-memory request processing for uploaded resumes. The resume optimizer parses the upload buffer, generates a tailored resume, returns the PDF to the browser, and stores only metadata in PostgreSQL. No object storage bucket is required, and there are no external object-storage deployment steps.

## Troubleshooting

- **Missing Gemini key:** server startup or resume generation fails with a Gemini env error. Set `GEMINI_API_KEY` or `GEMINI_API_KEYS`.
- **Missing `pdflatex`:** resume optimization may succeed but PDF generation fails. Install a TeX distribution or deploy the server with a Docker image that includes `pdflatex`.
- **Dodo webhook failures:** confirm the Dodo endpoint is `/payments-webhook`, `DODO_PAYMENTS_WEBHOOK_KEY` matches the webhook, and `DODO_PAYMENTS_ENVIRONMENT` matches test vs live mode.
- **Google OAuth redirect mismatch:** update Google Cloud authorized origins/redirect URIs after Render URLs change.
- **Email verification/reset failures:** verify `SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_PORT`; some hosting/network plans block outbound SMTP ports.
- **Database connection issues:** confirm `DATABASE_URL` is wired from `perfectresume-db` and run `npx prisma migrate deploy --schema=../db/schema.prisma` from the built server directory.
- **Client cannot reach API:** ensure `REACT_APP_API_URL` was set before the static client build and points to `perfectresume-server`.
- **Google Analytics admin stats errors:** verify the service account has GA4 property viewer access and the server variables are correct.
