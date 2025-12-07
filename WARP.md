# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Core commands

### Tooling and environment
- Node: `>=18` (see `engines.node` in `package.json`).
- Package manager: this repo uses `npm` (there is a `package-lock.json`).

### Install dependencies
```sh
npm install
```

### Run the app (Expo)
- Start Metro / Expo dev server:
  ```sh
  npm run start
  ```
- Run on a simulator/device via Expo:
  ```sh
  npm run ios
  npm run android
  ```

### Lint
ESLint is wired through Expo:
```sh
npm run lint
```

### Type-check (no dedicated script)
TypeScript is configured but there is no `tsc` script in `package.json`. To type-check the project:
```sh
npx tsc --noEmit
```

### Tests
There is currently **no test runner configured**:
- No `test` script in `package.json`.
- No `*.test.*` / `*.spec.*` files or Jest/Vitest config.

Before adding or running tests, you will need to introduce a test framework (e.g. Jest) and add the appropriate `npm` scripts. Until then there is no standard command for running a single test file.

### Project maintenance utilities
- Project reset helper (used to clear caches and reset local state during development):
  ```sh
  npm run reset-project
  ```

### Notifications native setup
There is an `install-notifications.sh` script at the repo root. Consult and run it when changing native notification configuration (push setup, iOS categories, etc.).

## High-level architecture

This is an Expo Router + React Native app that talks to a FastAPI-style backend and Supabase. The architecture is organized around:
- Expo Router for navigation (`app/`)
- React Query + MMKV for server state and caching
- Zustand + MMKV for user profile state
- AsyncStorage-based UI flags
- Axios-based API client for the main backend
- Supabase client for storage and related features

### Routing and screen layout (Expo Router)

**Entry layout**
- `app/_layout.tsx` is the root layout and wraps the entire app with:
  - `QueryPersistProvider` (React Query + MMKV persistence)
  - `UserProvider` (user + pantry + family membership context)
  - `FamilyProvider` (family list/selection context)
  - React Navigation `ThemeProvider` driven by `useColorScheme`.
- `unstable_settings.initialRouteName` is set to `"(tabs)"`, so tabs are the main shell once authenticated.

**Route groups**
- `app/(auth)/...` – authentication and account flows (login, signup, forgot password, family auth, email verification).
- `app/(main)/_layout.tsx` – wrapper around the authenticated experience:
  - Initializes notification categories and listeners.
  - Handles pending notifications that opened the app.
  - Registers the device for push notifications once `user.id` is available.
  - Renders nested routes via `<Slot />`.
- Inside `app/(main)/` there are route groups like `(home)`, `(tabs)`, and `(user)` that define the actual screens (home dashboard, tab navigation, profile, etc.).

When you add new screens, prefer using Expo Router conventions and grouping them under the appropriate `(auth)` or `(main)` route segment.

### Global state, caching, and persistence

The data layer is heavily documented in:
- `QUICKSTART.md` – practical examples and patterns.
- `CACHING_ARCHITECTURE.md` – full design of caching/state.
- `INTEGRATION_SUMMARY.md` – summary of what was added.

Key pieces you should be aware of when modifying data flows:

#### React Query configuration
- Centralized in `src/config/queryClient.ts`.
- Provides a shared `queryClient` with:
  - `staleTime` ~5 minutes and `gcTime` ~30 minutes by default.
  - Refetch on window focus, mount (if stale), and reconnect.
  - Limited retries with exponential backoff.
- Exposes **query key factories** grouped by domain:
  - `user`, `meals`, `pantry`, `chat`, `family`, `grocery`, `quickMeals`, `barcode`, `notifications`, `mealPlans`.
- Provides helpers:
  - `invalidateQueries.<domain>()` – convenience invalidation wrappers.
  - `prefetchQueries.*` – for preloading data before navigation.
  - `optimisticUpdate.*` – helper utilities for optimistic list updates.

When adding new React Query hooks or services, prefer:
1. Adding or extending a key factory under `queryKeys`.
2. Using these keys consistently in hooks and invalidation helpers.

#### MMKV storage and query persistence
- Implemented in `src/utils/mmkvStorage.ts`.
- Defines three MMKV instances:
  - `storage` – general app data.
  - `cacheStorage` – React Query cache.
  - `userStorage` – Zustand user store.
- For Expo Go, a mock MMKV implementation based on `AsyncStorage` is used; real MMKV is used in dev builds.
- Exposes typed wrappers (`MMKVStorage`) and a React Query persister `mmkvQueryPersister` used by `QueryPersistProvider`.

`providers/QueryPersistProvider.tsx` wraps `PersistQueryClientProvider` around the tree and:
- Persists successful queries to MMKV.
- Restores on app start and then invalidates queries to refetch in the background.

#### Zustand user profile store
- `store/userStore.ts` is the canonical user profile and macro-goal store.
- Persists to MMKV via a custom `StateStorage` adapter.
- Exposes:
  - `useUserStore` hook with actions like `updateProfile`, `setMacroGoals`, `resetProfile`, and fine-grained update methods (`updateAge`, `updateWeight`, etc.).
  - Selector helpers (`selectProfile`, `selectAge`, etc.) to avoid unnecessary re-renders.
  - Utility functions for nutrition logic (`calculateBMI`, `calculateBMR`, `calculateTDEE`, `getRecommendedMacros`).

When implementing new user-related UI or flows, use `useUserStore` selectors rather than duplicating user state in React context or component state.

#### Auth and token storage
There are two main token-related utilities:

- `src/utils/secureTokenStore.ts`
  - Uses Expo `SecureStore` to store access and refresh tokens, plus optional identifiers.
  - Exports individual functions (`saveAccessToken`, `getAccessToken`, `deleteAllTokens`, etc.) and a `secureTokenStore` namespace.
  - This is the **preferred** place to work with tokens for new code.

- `src/utils/storage.ts`
  - Bridges `SecureStore` and `AsyncStorage` under a `Storage` abstraction.
  - Writes primarily to `SecureStore` but mirrors values to `AsyncStorage` so older modules (like `apiClient` and other AsyncStorage-based code) continue to work.

**API client token behavior**
- `src/client/apiClient.ts` uses `AsyncStorage` directly to read/write `access_token` and `refresh_token` and implements:
  - Automatic `Authorization: Bearer` header injection.
  - 401 handling with refresh token logic (`/auth/refresh` endpoint).
  - Retry queue for concurrent requests during token refresh.
  - Basic network/backoff handling via `retryWithBackoff`.

When changing token handling, be careful to keep `Storage`, `secureTokenStore`, and `apiClient` in sync or migrate call sites toward a single source of truth.

#### UI flags (onboarding, tutorials, preferences)
- `src/utils/uiFlags.ts` manages non-sensitive, UI-only flags in `AsyncStorage`:
  - Tutorial and onboarding completion.
  - Feature guides (pantry, meal plan, notifications).
  - Push notification opt-in.
  - Theme preference and last app version.
- Exposes strongly-named getters/setters and a `resetAllUIFlags` helper.

Use these helpers instead of ad-hoc AsyncStorage keys when you need cross-screen UI flags.

### API and services layer

#### Backend API client
- `src/env/baseUrl.ts` defines `BASE_URL` for the main backend (with comments for local dev overrides).
- `src/client/apiClient.ts` wraps Axios and should be the primary HTTP client for all **non-Supabase** backend calls.

Prefer adding new HTTP operations as domain-specific functions under `src/services` instead of calling `apiClient` directly from components.

#### Domain services (`src/services`)
Services encapsulate HTTP calls for each domain:
- `chat.service.ts` – AI chat endpoints and helpers (send message, conversations, meal suggestions, recipes).
- `family.service.ts`, `grocery.service.ts`, `meals.service.ts`, `mealShare.service.ts`, `notification.service.ts`, `pantry.service.ts`, `pantryImageService.ts`, `mealImageService.ts`, `user.service.ts` – domain-level wrappers around `apiClient`.

These are typically consumed by React Query hooks under `hooks/`.

#### React Query hooks
- Generic patterns are illustrated in:
  - `hooks/usePantry.ts` – full set of pantry queries and mutations (with optimistic updates and invalidation).
  - `hooks/api/useMealPlans.ts` – example API hooks for meal plans (currently using mocked data; marked `TODO` to plug into real endpoints).
- Other domain hooks live in `hooks/` (`useMeals`, `useNotifications`, `usePantryImages`, `useGrocery`, `useMealShare`, `useChat`, etc.).

When adding or updating a data flow, follow this pattern:
1. Add or update a domain function in `src/services/...` using `apiClient`.
2. Wire it into a React Query hook under `hooks/` or `hooks/api/` using `queryKeys`.
3. Use that hook in components instead of calling services directly.

#### Supabase integration
- `src/supabase/client.ts` creates a Supabase client using a cross-platform storage adapter (`src/utils/storage`).
- Supabase is primarily used for storage-related features (e.g., images/buckets) with additional documentation in files such as `SUPABASE_STORAGE_SETUP.md`, `BUCKET_ROOT_STORAGE_COMPLETE.md`, `URGENT_BUCKET_CHANGE_COMPLETE.md`, etc.

When working on Supabase-related features, consult those markdown files for the current bucket layout and migration history.

#### AI features
- `src/utils/aiApi.ts` provides helpers for AI-powered grocery scanning:
  - Converts images/URIs to base64.
  - Sends them to `BASE_URL` AI endpoints (`/chat/scan-grocery`).
  - Exposes utilities for interpreting confidence scores.
- Additional AI-based flows (e.g. meal suggestions) are implemented via `chat.service.ts` and related components.

### Context providers

#### `UserProvider` (`context/usercontext.tsx`)
- Wraps the app in a context that exposes:
  - Current user object.
  - Update and refresh functions (`updateUserInfo`, `refreshUser`).
  - Logout routine that calls the backend logout endpoint and clears local tokens/flags.
  - User preferences, pantry items, and family membership state.
- Internally uses:
  - `getCurrentUser`, `listMyFamilies`, `listMyPantryItems`, `getMyprefrences` from `src/auth`/`src/user` submodules.
  - The shared `Storage` abstraction for tokens.

Use the `useUser()` hook when you need authenticated user data, membership status, or to trigger logout.

#### `FamilyProvider` (`context/familycontext.tsx`)
- Manages the list of families, selected family, and related loading/error state.
- Handles 401/unauthorized cases by logging the user out and redirecting to the login route.
- Exposes `useFamilyContext()` for consuming components.

### Notifications

Notifications are orchestrated across multiple layers:
- `app/(main)/_layout.tsx`:
  - Sets up notification categories and listeners.
  - Handles the notification that opened the app.
  - Registers the device for push notifications once `user.id` is known.
- `src/notifications/` (not exhaustively listed here) contains helpers for:
  - Handling incoming notification payloads.
  - Registering for push permissions and tokens.

There are several markdown files that document this system in detail:
- `NOTIFICATION_QUICK_START.md`
- `NOTIFICATION_SYSTEM_SETUP.md`
- `NOTIFICATION_API_EXAMPLES.md`
- `NOTIFICATION_SYSTEM_COMPLETE.md`

Consult these before modifying notification behavior or introducing new notification types.

### UI components and feature modules

- `components/` – shared UI components and feature-specific building blocks:
  - Authentication UI (`components/Auth/...`).
  - Pantry, meals, scanning, and tutorial components.
  - Design system primitives in `components/ui/` plus themed wrappers like `themed-text.tsx` and `themed-view.tsx`.
- `src/home`, `src/auth`, `src/user`, `src/notifications`, `src/scanners`, etc. – feature modules that organize higher-level logic around each domain.
- `constants/theme.ts` – theme tokens used across components.

When adding new UI, prefer reusing/expanding existing components and theme constants to keep the look and feel consistent.

## Important project documents

Besides this file, the following markdown documents capture important implementation details and should be read before making large changes:

- **Caching & state**
  - `QUICKSTART.md` – hands-on guide to using the caching architecture (with concrete examples for Zustand, UI flags, secure tokens, and React Query hooks).
  - `CACHING_ARCHITECTURE.md` – in-depth description of the overall data and caching design.
  - `INTEGRATION_SUMMARY.md` – summary of what was added/changed to integrate the caching stack.

- **Supabase & storage**
  - `SUPABASE_STORAGE_SETUP.md`
  - `BUCKET_ROOT_STORAGE_COMPLETE.md`
  - `URGENT_BUCKET_CHANGE_COMPLETE.md`
  - `CREATE_USERS_BUCKET.sql`

- **Image and AI integrations**
  - `MEAL_IMAGES_QUICK_START.md`, `MEAL_AI_IMAGE_COMPLETE.md`, `PANTRY_IMAGES_QUICK_START.md`, `PANTRY_AI_IMAGE_COMPLETE.md`, `MEAL_IMAGE_IMPLEMENTATION_GUIDE.md`, `GRACEFUL_IMAGE_FAILURE_COMPLETE.md`, `IMAGE_COMPRESSION_UPDATE.md` – document how meal and pantry images, AI image generation, and error handling are wired.

- **Notifications**
  - `NOTIFICATION_QUICK_START.md`, `NOTIFICATION_SYSTEM_SETUP.md`, `NOTIFICATION_API_EXAMPLES.md`, `NOTIFICATION_SYSTEM_COMPLETE.md`, `NOTIFICATION_SYSTEM_COMPLETE.md`, `EXPO_GO_COMPATIBILITY.md` – cover notification flows and Expo-specific considerations.

When making substantial changes in any of these areas, cross-check the relevant document(s) to understand prior design decisions and edge cases that were already handled.