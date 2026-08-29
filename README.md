<p align="center">
  <img src="./docs/assets/course-studio-cover.svg" alt="Course Studio: a Markdown editor beside a live slide preview" width="100%" />
</p>

<p align="center">
  <strong>Build the lesson, not the slide deck.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-pre--alpha-167e99?style=flat-square" alt="Status: pre-alpha" />
</p>

Course Studio is a Markdown-first course authoring app. Write lesson content in a focused editor and watch it become a navigable presentation in real time.

## What works today

- Markdown editing with CodeMirror
- Live, navigable slide preview
- Slide creation with `---` separators
- Resizable editor and preview workspace
- Focused presentation mode with <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>
- Minimal, Academic, and Dark presentation themes
- Responsive layout and light/dark appearance

<p align="center">
  <img src="./docs/assets/studio.png" alt="Course Studio landing page with a Markdown editor and presentation preview" width="100%" />
</p>

## Run it locally

```bash
git clone https://github.com/andremarques94/course-studio.git
cd course-studio
pnpm install
pnpm dev
```

Open [localhost:3000/studio](http://localhost:3000/studio).

Before opening a pull request:

```bash
pnpm check
pnpm build
```

## Project structure

```text
apps/web               TanStack Start application and studio UI
packages/presentation  Markdown presentation renderer
packages/themes        Presentation theme definitions and visual recipes
packages/ui            Shared UI components and styles
```

## Direction

Development moves one milestone at a time. The course and lesson model is next. Persistence, publishing, and accounts are intentionally outside the current pre-alpha.

## Contributing

The project is early and the shape is still settling. Bug reports and focused improvements are welcome. For larger changes, [open an issue](https://github.com/andremarques94/course-studio/issues/new) before writing the code.
