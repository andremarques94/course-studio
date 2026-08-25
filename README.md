<p align="center">
  <img src="./docs/assets/course-studio-cover.svg" alt="Course Studio: a Markdown editor beside a live slide preview" width="100%" />
</p>

<p align="center">
  <strong>Write course lessons in Markdown and see the slides as you type.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in_development-18181b?style=flat-square" alt="Status: in development" />
  <img src="https://img.shields.io/badge/roadmap-milestone_2_complete-786cff?style=flat-square" alt="Roadmap: milestone 2 complete" />
</p>

Course Studio is a work-in-progress course authoring app. The current build keeps the loop small: edit a Markdown lesson on the left, preview the presentation on the right.

## Right now

- Markdown editing with CodeMirror
- Live, navigable slide preview
- New slides from `---` separators
- Fullscreen preview with <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>

<p align="center">
  <img src="./docs/assets/studio.png" alt="Course Studio editor and presentation preview" width="100%" />
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

## Direction

Development moves one milestone at a time. Presentation themes are next. Courses, persistence, publishing, and accounts are planned, but they are not part of the current build.

## Contributing

The project is early and the shape is still settling. Bug reports and focused improvements are welcome. For larger changes, [open an issue](https://github.com/andremarques94/course-studio/issues/new) before writing the code.
