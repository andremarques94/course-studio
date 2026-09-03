<p align="center">
  <img src="./docs/assets/course-studio-cover.svg" alt="Course Studio: a Markdown editor beside a live slide preview" width="100%" />
</p>

<p align="center">
  <strong>Build the lesson, not the slide deck.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-pre--alpha-167e99?style=flat-square" alt="Status: pre-alpha" />
</p>

Course Studio is a Markdown-first course authoring app. Write lessons in Markdown, preview them as slides, and edit the same lesson with other people in real time.

## What works today

- Courses and lessons that persist between sessions
- Email/password and GitHub authentication with database-backed sessions
- Authenticated HTTP authoring and JWKS-verified collaboration connections
- Yjs-backed Markdown editing with persisted collaborative drafts
- Live slide preview; type `---` to start a new slide
- Minimal, Academic, and Dark presentation themes
- Real-time collaborative editing
- Remote cursors, selections, and collaborator presence
- Live connection and synchronization status
- PDF export
- Presentation mode with <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
- Light and dark appearance; resizable editor and preview panes

<p align="center">
  <img src="./docs/assets/studio.png" alt="Course Studio lesson editor beside a live presentation preview" width="100%" />
</p>

Open the same lesson on different computers and edit it together: updates sync instantly, with remote cursors, selections, and presence.

<p align="center">
  <img src="./docs/assets/collaboration.png" alt="Two collaborators editing the same lesson, with a remote cursor and a presence indicator" width="100%" />
</p>

## Run it locally

Prerequisites: Node.js, pnpm, and Docker.

```bash
git clone https://github.com/andremarques94/course-studio.git
cd course-studio
cp .env.example .env
# Replace BETTER_AUTH_SECRET in .env with: openssl rand -base64 32
pnpm install
pnpm db:up                                   # PostgreSQL in Docker
pnpm --filter @course-studio/db db:migrate   # apply the schema
pnpm dev                                     # web :3000, api :3001, collab :3002
```

Open [localhost:3000/studio](http://localhost:3000/studio). To try collaboration, open the same lesson in a second window.

Before opening a pull request:

```bash
pnpm check
pnpm build
pnpm exec playwright install chromium        # one-time browser install
pnpm test:e2e                                # requires migrated PostgreSQL
```

The E2E workflow runs Playwright against PostgreSQL, the HTTP API, the
Hocuspocus server, and isolated browser contexts. It covers the core authoring
journey and multiplayer behavior. Failed runs retain traces, screenshots, and
the HTML report for one day. Playwright starts the application services on
ports 3000-3002; stop local development servers before running the suite.

## Project structure

```text
apps/web               TanStack Start application and studio UI
apps/api               Hono HTTP API for courses and lessons
apps/collab            Hocuspocus WebSocket server for Yjs collaboration
packages/presentation  Markdown presentation renderer
packages/themes        Presentation theme definitions and visual recipes
packages/ui            Shared UI components and styles
packages/db            Drizzle schema, migrations, and database client
packages/auth          Better Auth server configuration
```

## Direction

Development moves one milestone at a time. Next: course ownership and lesson authorization.

## Contributing

The project is early. Bug reports and small improvements are welcome. For larger changes, [open an issue](https://github.com/andremarques94/course-studio/issues/new) first.
