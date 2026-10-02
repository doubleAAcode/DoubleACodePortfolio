# Desktop-app license switch

This adds a remote "stop switch" for the Double A desktop apps (first one: Android Control
Dashboard). It is separate from Double A Connect and touches none of the Connect paths.

## What it does

- Every client has a **license key**. The desktop app checks in at startup and every hour.
- The website answers with a **signed** message: `active`, `suspended` or `revoked`.
- You control it from **`/license-admin`**: suspend or revoke one client, or **Stop all clients**
  with one button.
- A suspended app stops all its automations and shows a lock screen with your message. It never
  deletes client data and does nothing to their phones except stop.
- If the website cannot be reached, the app keeps working for the **grace window** (default 72
  hours) and then locks until it can verify again.
- A license can be limited to N computers; extra computers are refused until you reset them.

## Files

| Path | Purpose |
| --- | --- |
| `src/routes/api.license.check.ts` | `POST /api/license/check`, the app's check-in |
| `src/routes/api.license.admin.ts` | `GET/POST /api/license/admin`, the switch panel's backend |
| `src/routes/license-admin.tsx` | the `/license-admin` page (not linked anywhere, `noindex`) |
| `src/features/license/` | protocol, decision logic, signing, store, handlers |
| `supabase/license/license_schema.sql` | tables + atomic seat registration (service-role only) |
| `tests/license/license.test.ts` | tests |

## One-time setup

1. **Database.** In the Supabase SQL editor, run `supabase/license/license_schema.sql`. RLS is on and
   there are no policies, so only the server (service role) can read or write these tables.
2. **Signing key.** In the desktop app repo run
   `node tools/license-server/generate-keypair.cjs --out <file outside the project and OneDrive>`.
   It writes the private key to that file and prints the public key.
3. **Vercel environment variables** (Project, Settings, Environment Variables, Production):
   - `LICENSE_SIGNING_PRIVATE_KEY` = the contents of the private key file
   - `LICENSE_ADMIN_TOKEN` = a long random token (32+ characters; a password manager can generate it)
   - optional: `LICENSE_GRACE_HOURS`, `LICENSE_CHECK_INTERVAL_SEC`
   Back up the private key somewhere safe, then delete the file. If it is lost every client has to be
   re-released with a new public key.
4. **Desktop app.** Paste the public key into `LICENSE_PUBLIC_KEY_BASE64` and set
   `LICENSE_SERVER_URL` to `https://doubleacode.com/api/license/check` in
   `src/main/services/license/license-config.ts`, then build the installer.
5. **Rate limit (recommended).** Add a Vercel Firewall rule limiting `/api/license/*` per IP. The
   built-in limiter is per serverless instance, so it only blunts casual abuse.

## Using it

- Open `https://doubleacode.com/license-admin` and enter the admin token.
- **New license**: enter the client name and how many computers; the key is shown **once**. Send it to
  the client; they paste it into the app's activation screen.
- **Suspend / Activate / Revoke**: takes effect at the app's next check-in (within an hour while
  online; immediately when the client presses "Check again").
- **Stop all clients**: locks every app at its next check-in regardless of its own license; add a
  message if you want clients to see why. **Resume all clients** lifts it.
- **Reset computers**: forgets which computers a license has been used on, for example after a client
  replaces their PC.

## Security notes and limits

- Replies are signed with Ed25519; the app verifies them with a public key built into the app, so a
  fake server or an edited hosts file cannot unlock a locked app. Replies are bound to the license
  key, the computer and a per-request nonce, so a recorded reply cannot be replayed.
- A client that is offline keeps its last "active" answer until its validity ends. That is the grace
  window: a suspension reaches an offline computer only when it reconnects or the window ends.
- The app runs on the client's computer, so a determined technical user can patch or block it. The
  signature checks and the Electron integrity settings make that harder, and the stronger option is
  to serve something the app needs (for example its automation config) only to active licenses.
- Tell clients about the remote suspension in your contract and say what the app sends: license key,
  a hashed computer id and the app version.
- Failed admin attempts are throttled and the token comparison is constant-time. Rotate
  `LICENSE_ADMIN_TOKEN` in Vercel if it is ever exposed.

## Local development

`LICENSE_STORE=memory` (ignored in production) uses an in-memory store so the whole flow can be tried
without Supabase. Run `npm test` for the unit tests.
