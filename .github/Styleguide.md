# Styleguide

- Use strict TypeScript: no any, no implicit any, prefer unknown, readonly, exact types, discriminated unions, utility types (Pick, Omit), and generics. Enable strict options (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes).
- Co-locate UI, separate logic: keep components lean (JSX + wiring). Put business logic, data transforms, pure functions, schema/types, and fetchers in helpers/services. Import into components. Favor pure functions.
- Signals and reactivity: prefer createSignal/createMemo over stores when possible; memoize derived values; avoid unnecessary effects; use onCleanup; prevent stale closures; avoid prop drilling via context only when necessary.
- Each section should use its own Context Store Provider.
- Components: small, focused, single responsibility; stable props and keys; typed props (interfaces) with defaults; avoid heavy computation in render; no side effects in render path.
- KISS, DRY, YAGNI: simplest working solution; deduplicate via helpers/hooks; don’t add abstractions until repeated 2+ times; remove dead code.
- Data and IO: validate inputs/outputs with a schema (valibot); narrow types at boundaries; handle errors with Result/Either style or typed exceptions; never swallow errors; typed fetch wrappers; isolate API URLs/config.
- Styling: use UnoCss utilities for styling and don't use concatinated strings for styling. use cn() helper from @/libs/cn.ts for styling.
- State management: keep state local; lift state only when needed; model state with precise types (tagged unions for async: 'idle' | 'loading' | 'success' | 'error').
- Performance: lazy-load routes/chunks; split code with dynamic import; debounce/throttle expensive reactions; prefer memoized derived state; avoid unnecessary context churn.
- Accessibility/semantics: use components from /components/ui first and use semantic HTML, labels, ARIA where needed; keyboard-first; manage focus on route/portal changes.
- Dont use comments which explain the code.
- Use @ for imports.
- run "bun run lint" and "bunx tsc --noEmit" to check for errors.

Golden rule: strongly-typed boundaries, pure helpers, thin components, minimal effects, simple first.
