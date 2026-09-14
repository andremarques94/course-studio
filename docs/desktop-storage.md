# Desktop studio and storage

PR #31 keeps `apps/web/src/features/courses/repository.ts` as the course data-access boundary. It removes a duplicate handwritten type and a forwarding module, not the repository operations. Queries and mutations still call `courseRepository`; HTTP response validation and date conversion stay inside that implementation.

There is no SQLite adapter or runtime backend selection today. The previous interface did not provide either of those features. Keep HTTP calls behind the repository rather than introducing them in components.

## Two storage responsibilities

| Responsibility | Current boundary | Desktop direction |
| --- | --- | --- |
| Course and lesson metadata, creation, deletion and ordering | `courseRepository` | Reuse the API implementation for remote courses; add a SQLite implementation for local courses. |
| Live Markdown and theme edits | `LessonDocument`, supplied to `Studio` | Use the collaborative document for remote editing, or persist a local Yjs document in SQLite. |
| Rename and export actions | `StudioCommands`, supplied to `Studio` | Supply desktop commands for metadata writes and native export. |
| Sharing, invitations and permissions | Remote API operations currently grouped in `courseRepository` | Treat these as remote capabilities, not mandatory methods on a local SQLite adapter. |

`createLocalLessonDocument` is currently in-memory and is used in tests. It is not durable storage. `WebStudio` explicitly constructs the Hocuspocus document and web commands. A desktop composition component must supply its own implementations. The shared `Studio` also still uses the app shell, sidebar and routing-dependent components, so it is not yet a standalone desktop package.

The current API/database package uses PostgreSQL. It cannot switch to SQLite by changing `DATABASE_URL`. If the desktop embeds a local API, its database implementation and migrations still need SQLite support. If the renderer uses native IPC, keep SQL and filesystem access in the native process and expose the required operations to the UI.

## When implementing desktop

1. Decide whether local courses remain local, are explicitly published, or synchronize with remote courses. Do not silently fall back to a local database when a remote request fails.
2. Extract the course/lesson operations actually needed by both adapters into a small shared contract and inject the selected adapter into queries and commands. Separate remote sharing operations. The old all-in-one interface need not be restored now.
3. Persist and restore the local Yjs document, including theme metadata. For documents that will synchronize, preserve Yjs state rather than recreating independent documents from Markdown on every launch. Define initialization, durable save acknowledgement, recovery and shutdown behavior.
4. Scope query caches and document storage to the account and backend/workspace. The current ID-only query keys must not mix local and remote courses. Recreate or clear the relevant caches when switching.
5. Extract the reusable editor UI from the web app, reuse `@course-studio/validation` for title and invitation input rules, then provide desktop navigation, authentication and export integration. Local-only editing should not require a remote session; remote editing still requires API and collaboration authentication.

The repository simplification does not block these steps. `LessonDocument` and `StudioCommands` already represent distinct implementations and should remain explicit boundaries.

## Remaining cleanup after this follow-up

- Consolidate invitation token replacement/delivery/restoration with database integration coverage, especially concurrent acceptance and revocation.
- Align TypeScript versions and replace floating dependency tags in a dedicated dependency change.
- Resolve the presentation resize-ref type mismatch against the installed hook types.

This follow-up centralizes invitation HTTP errors in the application handler and replaces unsafe invitation route test casts with typed fixtures. It does not implement desktop storage or change invitation persistence.

The shared validation package is now used by the API and web forms/repository. It owns title constraints, invitation roles and normalized invitation email inputs, and imports only Zod. The API now uses the same friendly invalid-email issue message as the form. Token checks remain separate: the web validates the generated 43-character token format, while the API accepts a bounded string and lets the invitation service reject invalid or expired tokens.
