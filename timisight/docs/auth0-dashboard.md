# Auth0 dashboard guide — TimiSight

Everything in this file is configured in the **Auth0 dashboard**
([manage.auth0.com](https://manage.auth0.com)), not in app code. None of it requires a
rebuild of the app — these are server-side settings on your Auth0 tenant.

- **Tenant:** `dev-p2iugivimzir6tq0`
- **Application:** TimiSight (Native), Client ID `pzK3QwxU4Sjjj6903P9RWVPzYfxZjOU0`
- **Domain:** `dev-p2iugivimzir6tq0.us.auth0.com`

Auth0 occasionally reorganizes its dashboard, so if a path below doesn't match exactly,
use the **search bar at the top** of the dashboard (type the setting name) to jump to it.

---

## 1. Callback & logout URLs (already configured — do not break these)

The app sends a redirect of `timisight://redirect` (native) and
`http://localhost:8081/redirect` (web). These **must** stay whitelisted or login/logout
breaks with a "Callback URL mismatch".

**Path:** Applications → Applications → **TimiSight** → **Settings**

- **Allowed Callback URLs:** `timisight://redirect, http://localhost:8081/redirect`
- **Allowed Logout URLs:** `timisight://redirect, http://localhost:8081/redirect`

> A bare `timisight://` is **rejected** by Auth0's URL validator (empty authority). The
> `/redirect` path is required. If you ever change the scheme/path in
> `src/hooks/auth.tsx` (`makeRedirectUri`), update these fields to match.

Scroll to the bottom and **Save Changes** after any edit (easy to miss).

---

## 2. Password rules (strength / minimum length)

Currently the minimum length is high (≈15 chars). To relax it:

**Path:** **Authentication → Database** → select your connection
(usually `Username-Password-Authentication`) → **Password Policy** tab.

Here you can set:
- **Password Strength** — one of five preset levels (None → Excellent). Lower levels
  require fewer character classes.
- **Password length** — minimum / maximum length fields (min can go as low as 1; a
  common sensible value is 8).
- Optionally: password history, dictionary (common-password blocklist), and blocking
  personal data in passwords.

Change the length/strength, then **Save**. The new policy applies on the next signup or
password change (existing passwords are not re-validated).

> Newer tenants show this as the **Flexible Password Policy**, which lets you tune each
> requirement independently instead of picking a single preset. Same location.

Content rephrased for compliance; source:
[Password strength in Auth0 database connections](https://auth0.com/docs/authenticate/database-connections/password-strength).

---

## 3. Email verification (require a verified email before login)

Not enforced by default — a user can sign up and log in immediately without confirming
their email. To require verification:

**Option A — block unverified users with an Action (recommended, explicit):**

**Path:** **Actions → Triggers → `post-login`** → add an Action with code like:

```js
exports.onExecutePostLogin = async (event, api) => {
  if (!event.user.email_verified) {
    api.access.deny('Please verify your email address before logging in.');
  }
};
```

Deploy the Action and drag it into the **Login** flow. Auth0 still sends the
verification email automatically on signup; this Action stops login until the user
clicks the link.

**Option B — email provider / templates:**

**Path:** **Branding → Email Templates → Verification Email** to customize the email that
gets sent. (This controls the message, not the enforcement — enforcement is Option A.)

To re-send or check status for a specific user: **User Management → Users** → select the
user → their `email_verified` flag is shown there.

---

## 4. First-party app consent ("Authorize App" screen)

The "Authorize App — TimiSight is requesting access to your account (Decline / Accept)"
screen is the **OAuth consent prompt**. For a **first-party** app (one you own — which
TimiSight is), this consent is redundant and can be skipped. It most often appears
because the app runs on `localhost` in development; it may disappear on its own once you
run against a non-localhost callback.

To suppress it:

**Path:** **Settings** (tenant settings, the gear / tenant name at top-left) →
**Advanced** tab → enable **"Allow Skipping User Consent"** (wording may vary:
"Skip user consent for first-party applications"/similar).

Also confirm the application is treated as first-party:

**Path:** Applications → **TimiSight** → **Settings** → the app should be first-party
(first-party is the default for apps you create; there's no separate toggle on most
tenants).

> Note: consent can still be forced to appear on `localhost` in dev regardless of this
> setting. Verify the behavior against a real (non-localhost) redirect before concluding
> it isn't working.

---

## 5. Customizing the login screen appearance (branding)

Yes — the Auth0 login/signup page can be branded to look like TimiSight. Levels, from
easiest to most powerful:

### Level 1 — Branding (no code, ~10 minutes, recommended first)

**Path:** **Branding → Universal Login**

- **Settings / Styles:** primary (accent) color, page background color/image, button and
  input styling, border radius, widget alignment.
- **Logo & favicon:** **Branding → Universal Login → Customization** (or
  **Settings → Branding**) — upload the TimiSight logo; it shows at the top of the login
  widget.
- **Fonts:** set a custom font URL if desired.

This alone makes the hosted page read as "TimiSight" (your logo + brand blue `#208AEF`
to match the app's splash) without touching any HTML.

### Level 2 — Page templates (Liquid, some code)

**Path:** **Branding → Universal Login → Advanced Options / Templates**

Edit the HTML wrapper (header/footer/layout) around the login widget using Liquid
template syntax. Use this if branding alone isn't enough.

### Level 3 — Advanced Customizations for Universal Login (ACUL, full control)

Build the login screens as your own front-end components for a pixel-perfect match to
the app. Most effort; only needed if levels 1–2 are insufficient.

> Use **Universal Login** (the default). Auth0 no longer actively develops the older
> **Classic Login**, so avoid switching to it unless you have a specific reason.
> Content rephrased for compliance; source:
> [Universal Login vs. Classic Login](https://auth0.com/docs/authenticate/login/auth0-universal-login/universal-login-vs-classic-login).

**Recommendation for now:** do Level 1 (logo + brand color). It's the biggest visual win
for the least effort, and it needs no app changes or rebuild.

---

## Quick reference — where things live

| Setting | Dashboard path |
| --- | --- |
| Callback / logout URLs | Applications → TimiSight → Settings |
| Password rules | Authentication → Database → (connection) → Password Policy |
| Require verified email | Actions → Triggers → post-login (add Action) |
| Skip first-party consent | Settings (tenant) → Advanced → Allow Skipping User Consent |
| Login page branding | Branding → Universal Login |
| See / manage users | User Management → Users |
