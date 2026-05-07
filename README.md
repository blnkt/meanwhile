# Meanwhile (Expo React Native App)

Developer guide for onboarding and day-to-day work in this repository.

## Tech stack at a glance

- Expo SDK 54 + React Native 0.81.5
- TypeScript (strict)
- Expo Router (file-based routes)
- Tailwind utility classes via Uniwind
- Zustand for app state
- i18next + react-i18next for localization
- Jest + React Native Testing Library for tests

Primary config references:
- `package.json`
- `app.config.ts`
- `env.ts`
- `tsconfig.json`

## Requirements

- Node.js LTS
- pnpm (`packageManager` is pinned in `package.json`)
- Xcode + iOS simulator (for iOS)
- Android Studio + emulator (for Android)
- Watchman (recommended on macOS/Linux)

## Quick start

```sh
pnpm install
pnpm ios
```

Alternative local run commands:
- `pnpm android`
- `pnpm web`
- `pnpm start` (Expo dev server)

## Environment configuration

Environment variables are validated in `env.ts`.

Key variables:
- `EXPO_PUBLIC_APP_ENV` (`development` | `preview` | `production`)
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_VAR_NUMBER`
- `EXPO_PUBLIC_VAR_BOOL`
- `APP_BUILD_ONLY_VAR` (build-time only, optional)

Environment-specific commands set `EXPO_PUBLIC_APP_ENV` for you (for example `pnpm start:preview`, `pnpm ios:production`).

Prebuild variants (`prebuild:development`, `prebuild:preview`, `prebuild:production`) also set `STRICT_ENV_VALIDATION=1`, which will fail fast on invalid env values.

## Project structure (where to add things)

```text
src/
  app/                 Expo Router routes and layouts
  components/ui/       Shared UI primitives and icons
  features/            Feature modules (journal, settings, etc.)
  lib/                 Shared non-UI logic (i18n, storage, hooks, utils)
  translations/        Locale JSON files
  global.css           Tailwind/Uniwind entry styles
```

### Add routes, screens, and layouts

- Add route files in `src/app/` (Expo Router naming conventions apply).
- Root providers/layout live in `src/app/_layout.tsx`.
- Main app tab layout is `src/app/(app)/_layout.tsx`.
- Example routes:
  - `src/app/(app)/index.tsx`
  - `src/app/(app)/all-entries.tsx`
  - `src/app/(app)/day/[day-key].tsx`
  - `src/app/(app)/entry/new.tsx`
  - `src/app/(app)/entry/[entry-id].tsx`

### Add feature logic and screens

- Add new domain code under `src/features/<feature-name>/`.
- Keep feature-specific screens, helpers, tests, and state together.
- Example module: `src/features/journal/`.

### Add shared UI components

- Put reusable design-system style components in `src/components/ui/`.
- Re-export from `src/components/ui/index.tsx` when appropriate.
- Icon components live in `src/components/ui/icons/` and are re-exported via `src/components/ui/icons/index.tsx`.

### Add shared utility/app logic

- Place cross-feature logic in `src/lib/`.
- Typical locations:
  - `src/lib/i18n/` for localization runtime
  - `src/lib/storage.tsx` for MMKV-based storage
  - `src/lib/hooks/` for shared hooks
  - `src/lib/utils.ts` for general helpers

### Import conventions

- Use absolute imports via `@/` (configured in Babel/TypeScript).
- Prefer `@/components/...` and `@/features/...` over deep relative imports.

## Scripts reference

All scripts are in `package.json`.

### Local development

- `pnpm start`: Start Expo dev server.
- `pnpm ios`: Build/run app on iOS simulator/device.
- `pnpm android`: Build/run app on Android emulator/device.
- `pnpm web`: Run web target.
- `pnpm xcode`: Open iOS project in Xcode.
- `pnpm prebuild`: Generate native projects from Expo config.
- `pnpm doctor`: Run Expo doctor checks.

### Environment-specific run/prebuild

- `pnpm start:preview`
- `pnpm start:production`
- `pnpm ios:preview`
- `pnpm ios:production`
- `pnpm android:preview`
- `pnpm android:production`
- `pnpm prebuild:development`
- `pnpm prebuild:preview`
- `pnpm prebuild:production`

Use these when you need behavior tied to `EXPO_PUBLIC_APP_ENV`.

### Code quality

- `pnpm lint`: Run ESLint.
- `pnpm lint:fix`: Run ESLint with autofix.
- `pnpm type-check`: Run TypeScript no-emit checks.
- `pnpm lint:translations`: Validate/fix translation JSON lint rules.
- `pnpm check-all`: Lint + type-check + translation lint + tests.

### Testing

- `pnpm test`: Run Jest once.
- `pnpm test:watch`: Run Jest in watch mode.
- `pnpm test:ci`: Run Jest with coverage output.
- `pnpm install-maestro`: Install Maestro CLI.
- `pnpm e2e-test`: Run Maestro scenarios in `.maestro/`.

### Build and release

- `pnpm build:development:ios`
- `pnpm build:development:android`
- `pnpm build:preview:ios`
- `pnpm build:preview:android`
- `pnpm build:production:ios`
- `pnpm build:production:android`
- `pnpm app-release`: Runs the configured release flow (`np`) without publishing.

## Testing strategy

### Unit/component tests

- Framework: Jest + React Native Testing Library.
- Config: `jest.config.js`.
- Global test setup/mocks: `jest-setup.ts`.
- Test naming pattern: `*.test.ts` and `*.test.tsx` (also `*.spec.ts(x)`).
- Existing tests are colocated with code (for example in `src/features/journal` and `src/components/ui`).

### E2E tests

- Tool: Maestro.
- Specs: `.maestro/**/*.yaml`.
- Run with `pnpm e2e-test`.

## Linting, type checking, and hooks

- ESLint config: `eslint.config.mjs`.
- Lint-staged config: `lint-staged.config.js`.
- Husky hooks:
  - `.husky/pre-commit`: runs type-check + lint-staged.
  - `.husky/commit-msg`: runs commitlint.

Practical PR gate to run locally:

```sh
pnpm check-all
```

## Internationalization (i18n)

- Translation files: `src/translations/en.json`, `src/translations/ar.json`, `src/translations/es.json`.
- Resource registration: `src/lib/i18n/resources.ts`.
- i18n setup/runtime: `src/lib/i18n/index.tsx`.
- Use `translate(...)`/i18n helpers consistently; keep translation keys synchronized across locale files.
- Validate with `pnpm lint:translations`.

## Assets and icons

### Icons

- UI icons are React components in `src/components/ui/icons/`.
- Add new icon components there and export from `src/components/ui/icons/index.tsx`.

### App assets

- App icon/splash/favicon paths are configured in `app.config.ts`.
- Expected paths include:
  - `./assets/icon.png`
  - `./assets/adaptive-icon.png`
  - `./assets/favicon.png`
  - `./assets/splash-icon.png`

If an asset path referenced by `app.config.ts` does not exist, add the file in `assets/` with the expected name.

## Playbooks for adding new code

### Add a new UI component

1. Create `src/components/ui/<component-name>.tsx`.
2. Keep API small and composable (props + variants).
3. Add tests in `src/components/ui/<component-name>.test.tsx` when behavior is non-trivial.
4. Export it through `src/components/ui/index.tsx` if shared broadly.

### Add a new screen/route

1. Create a route file in `src/app/...`.
2. Implement screen logic in `src/features/<feature-name>/...` when feature-specific.
3. Wire navigation through Expo Router (`Link`, `router.push`, or tabs/layout config).
4. Add/update tests for key screen behavior.

### Add shared utility logic

1. Put cross-feature helper code in `src/lib/` (or feature-local helper in `src/features/<feature>/`).
2. Keep pure logic separate from UI for testability.
3. Add unit tests near the utility (`*.test.ts`).

## Day-to-day checklist before opening a PR

1. Ensure translations are updated for any new user-facing strings.
2. Run `pnpm lint:fix` if needed.
3. Run `pnpm check-all`.
4. Confirm the relevant platform run command still works (`pnpm ios` / `pnpm android`).
