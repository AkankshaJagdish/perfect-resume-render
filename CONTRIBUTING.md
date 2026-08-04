# Updating the Template to Latest Wasp Version

## Template Files

Start by removing the old template folders:

```shell
rm -rf app e2e-tests blog
```

Then recreate the template file structure from the latest template version:

```shell
wasp new saas-app -t saas && \
cp -r saas-app/{app,e2e-tests,blog} . && \
cp saas-app/.gitignore . && \
rm -rf saas-app
```

## Changes on Top of Template

### Email Sender

PerfectResume uses Wasp's `SMTP` email sender in `app/src/server/emailSender.wasp.ts`. Keep `app/.env.server.example`, `render.yaml`, and the root README aligned with the SMTP variables (`SMTP_HOST`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SMTP_PORT`).

## Re-add the Initial Migration

Start the database in a separate terminal window:

```bash
cd app/
wasp db start
```

Run the migrations to generate the `package-lock.json` and `migrations` dir:

```bash
cd app/
cp .env.server.example .env.server
wasp db migrate-dev --name "init"
```

## Test That Everything Works

Start the app:

```bash
# Make sure the database is still running from the previous step.
cd app/
wasp start
```

## Render Blueprint

Bump the Wasp CLI version in both `render.yaml` build commands:

```diff
-npm install -g @wasp.sh/wasp-cli@old
+npm install -g @wasp.sh/wasp-cli@new
```

Check the latest [Render deployment guide](https://wasp.sh/docs/guides/deployment/cloud-providers/render) and update `render.yaml` if the recommended commands changed.

### Smoke Test the Blueprint

1. Push a branch containing the updated `render.yaml`.
2. Open the [Render dashboard](https://dashboard.render.com/) and log in with the Wasp account.
3. Click `New > Blueprint` and select the branch.
4. Apply the Blueprint and wait until the database, server, and client services are created.
5. Fill all `sync: false` secrets listed in `render.yaml`.
6. Confirm `WASP_SERVER_URL`, `WASP_WEB_CLIENT_URL`, and `REACT_APP_API_URL` are wired from the Render service URLs.
7. Run `npx prisma migrate deploy --schema=../db/schema.prisma` from `app/.wasp/out/server` on the server service.
8. Verify the client URL loads and the server returns `200`.
9. Do not expect login, email, payments, upload, or resume generation flows to work during this smoke test unless real provider env vars and `pdflatex` are configured.

If a service fails, inspect its build and deploy logs. Common causes are missing variables, stale Wasp build commands, or changes in Wasp's generated output layout.
