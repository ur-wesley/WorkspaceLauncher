# Frontend Template

You can quickly scaffold a new project based on this template using [degit](https://github.com/Rich-Harris/degit):

```bash
bunx degit ur-wesley/app-template <project-directory>
cd <project-directory>
bun install
```

## Stack

| Technology       | Description                                                                             |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Solid.js**     | A declarative, efficient, and flexible JavaScript library for building user interfaces. |
| **UnoCSS**       | A utility-first CSS framework for rapid UI development.                                 |
| **shadcn-solid** | A collection of reusable components built with Solid.js and Tailwind CSS.               |

## Available Scripts

| Script   | Description                                                          |
| -------- | -------------------------------------------------------------------- |
| `start`  | Runs the app in development mode using Vite.                         |
| `dev`    | Runs the app in development mode using Vite.                         |
| `build`  | Builds the app for production using Vite.                            |
| `serve`  | Previews the production build using Vite.                            |
| `lint`   | Runs Biome to check and fix linting issues in the `./src` directory. |
| `format` | Runs Biome to format code in the `./src` directory.                  |
| `add`    | Adds a new component using shadcn-solid.                             |
| `deps`   | Updates dependencies using taze.                                     |
| `bump`   | Bumps the version number using bumpp.                                |
