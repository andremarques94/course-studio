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

## Shared contracts

`@course-studio/validation` owns title constraints, invitation roles/email/token formats, strict lesson rename and ordering inputs, course/lesson/member/invitation response schemas, and lesson content validation. Response parsing retains Date conversion and the distinction between lesson summaries and full documents. The package depends on Zod and the lightweight `@course-studio/themes/ids` entry point; it does not import database, authentication or rendering code.

The theme package owns the built-in ID list. Theme recipes must satisfy that list, and the API, collaboration loader and PDF export use its shared validation. Adding a built-in theme therefore no longer requires separate hardcoded allowlists in each application.

`StudioCommands.renameLesson(title)` only renames metadata. Theme changes go through `LessonDocument`. The outline and studio reuse the same lesson-cache update, which preserves live collaborative content and does not create unloaded cache entries.

The API continues to accept a bounded invitation-token string so the service owns invalid/expired-token responses. Browser redirects and invitation links share the strict generated-token format. Environment, HTTP parameter and Better Auth session schemas remain local to their integrations.

Invitation replacement and resend share token replacement, delivery and conditional restoration. A first failed delivery retains the new invitation for retry. A failed replacement restores the previous pending invitation only if it is still using the attempted token and has not been accepted or revoked. Integration tests cover acceptance, revocation and another token replacement during delivery for both operations.
