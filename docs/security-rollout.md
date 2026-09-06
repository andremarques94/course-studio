# Step 1 security rollout

This change builds on authorization PR #1. Merge that PR first, then retarget this follow-up to `master` if needed.

## Password accounts and email delivery

Password signup no longer signs users in immediately. They must verify their email and then sign in. Attempting password sign-in before verification sends another verification email (subject to Better Auth's rate limits). Verification does not automatically establish a session, so opening a link cannot silently sign a person into a pre-created account.

Implicit OAuth linking is disabled, including for verified local accounts. Existing linked OAuth accounts can still sign in. A new provider login matching an existing email must be linked explicitly from an authenticated account in a future account-settings flow. Do not work around this by re-enabling automatic linking.

Set these **API runtime** variables before deploying in production:

| Variable | Value |
| --- | --- |
| `SMTP_HOST` | Your provider's SMTP host |
| `SMTP_PORT` | Usually `587` for STARTTLS or `465` for implicit TLS |
| `SMTP_SECURE` | `false` for STARTTLS, `true` for port 465 |
| `SMTP_USER` / `SMTP_PASSWORD` | Provider credentials, configured together when needed |
| `MAIL_FROM` | A sender email verified with your provider |

The API fails startup in production without `SMTP_HOST` and `MAIL_FROM`. Production SMTP requires TLS with certificate validation. Credentials never belong in Vite variables. Configure sender/domain authentication at your chosen mail provider and verify actual inbox delivery before opening registration.

For development, `docker compose up -d postgres mailpit` starts a local mailbox at `http://localhost:8025`. Set SMTP_HOST=localhost, SMTP_PORT=1025, SMTP_SECURE=false and MAIL_FROM=noreply@example.com. With no SMTP configured, development prints verification links to the API console; this is never allowed in production. E2E uses Mailpit on ports 1025/8025 and follows actual delivered links.

For an existing database, do not bulk-mark unverified users as verified. Review potentially pre-created accounts and revoke their existing sessions before rollout. Requiring email verification at sign-in does not retroactively revoke old sessions. Staging was reported wiped, so this may not apply there.

## Presentation content

Markdown output is sanitized with an explicit HTML/attribute/protocol allowlist. JavaScript, SVG, iframes, arbitrary style/event attributes and data URLs are not supported. Normal headings, lists, tables, links, HTTP(S) images, fenced code and speaker notes remain supported. Both preview and PDF export use the same Presentation component.

Reveal's Markdown comment attributes are disabled because the adapter applies them after HTML rendering. This deliberately removes arbitrary `.slide` and `.element` annotations. Add future presentation features through typed, allowlisted options rather than restoring unrestricted attributes.

## Verification

- Run lint/typecheck/build and the auth/presentation security tests.
- Run database integrations with DATABASE_URL configured.
- Run `pnpm test:e2e` with Postgres and Mailpit running. Signup must not authorize API access until verification and sign-in succeed.
- Check real SMTP delivery and existing OAuth login in staging. No real provider credentials or external email delivery were available during implementation.
- Keep the separate issues for offline durability, production-image smoke tests, restores and multiple collaboration writers on the release checklist.
