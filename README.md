# BTC2 (web version)

A React chat application built with Vite and Mantine — direct messages, group chats, and link previews — designed to work with the [BTC2-API](https://github.com/beetron/btc2-api) backend.

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🚀 Setup](#-setup)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [🏗️ Project Structure](#️-project-structure)
- [🔑 Authentication & Sessions](#-authentication--sessions)
- [🔌 Real-time (Socket.IO)](#-real-time-socketio)
- [🛡️ Admin](#️-admin)
- [🔗 Services](#-services)

## ✨ Features

- **Unified chat list**: direct and group conversations in one list, with unread badges and last-activity time
- **Group chat**: create groups, rename, manage members (add/remove/leave), role-aware UI (owner/member)
- **Add Friend from a group**: a non-friend group member can be sent a friend request right from the group settings modal
- **Cursor-paginated messages**: older history loads as you scroll up, scroll position preserved
- **Image messages**: attach and preview images in any conversation
- **Message actions** (right-click a message): **Reply** with a quote of the original, **Copy text**, and for your own messages **Edit** (the message then shows its edit time with an "edited" label, and keeps its place in the thread) and **Delete for everyone** (leaves a "This message was deleted" placeholder; every image in that message is deleted too)
- **Link previews**: a small unfurl card (image/title/description) renders under any message containing a URL
- **Friend management**: add, accept/reject requests, block/unblock, report
- **Persistent sessions**: silent access-token refresh in the background — no forced re-login as long as the app is used at least once every 14 days
- **Dark/Light theme** toggle
- **Responsive design**: desktop and mobile
- **Offline-friendly message cache** (IndexedDB) for instant paint on reopen. Edits and deletes reach open chats and the cache through the API's changes feed, including for messages older than the newest page; messages removed outright (an admin purge) are dropped on the next sync
- **Admin area** (`/admin`, admin account only): search and list users, add a user directly (they start out as the admin's friend), edit username/email/unique ID/password, delete everything a user sent, delete a user. See [Admin](#️-admin).

## 🛠️ Tech Stack

- **Frontend Framework**: React 19
- **Build Tool**: Vite
- **UI Library**: Mantine
- **HTTP Client**: Axios
- **Icons**: Tabler Icons
- **Routing**: React Router
- **Real-time**: Socket.IO Client
- **Language**: TypeScript

## 🚀 Setup

### Prerequisites

- Node.js 22.12+ or 24 (Vitest 5 needs one of these; CI uses 24)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd btc2-web
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables (see below).

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building

```bash
npm run build
```

The built files will be in the `dist/` directory.

### Lint and tests

```bash
npm run lint   # ESLint 10 with typescript-eslint and the React hooks rules (eslint.config.js)
npm test       # Vitest unit tests (src/**/*.test.ts)
```

The tests cover the logic that runs without a browser or API: message sync (applying edits and deletes, refreshing quotes), URL detection in messages, image upload validation and the retry id.

### PR Review (CI)

`.github/workflows/pr-review.yml` runs on every PR into `main`, on pushes to `main` and by hand. Every job must pass:

| Job | What it checks |
|---|---|
| Lint | `npm run lint` |
| Typecheck and build | `npm run build` (`tsc -b`, then the Vite production build) |
| Tests | `npm test` |
| Dependency audit | `npm audit --audit-level=high` (moderate and low are reported, not blocking) |
| CodeQL | GitHub's security analysis for JavaScript/TypeScript (`security-extended`) |
| Semgrep | Community rules `p/javascript`, `p/typescript`, `p/react`, `p/secrets` |

## ⚙️ Environment Configuration

The API base URL comes from a single variable, `VITE_API_URL`, set per Vite mode:

- `.env.development` — used by `npm run dev`
  ```env
  NODE_ENV=development
  VITE_API_URL=http://localhost:3000
  ```
- `.env` — used by `npm run build` / production
  ```env
  VITE_API_URL=https://api.yourapp.com
  ```

`src/config.ts` reads this via `import.meta.env.VITE_API_URL`, falling back to `http://localhost:3000` if unset. The Socket.IO client derives its own connection URL from the same value.

## 🏗️ Project Structure

```
src/
├── components/
│   ├── AdminRoute.tsx          # Route guard for /admin pages (asks /users/me before rendering)
│   ├── AuthHeader.tsx          # Header shown on login/signup/forgot-* pages
│   ├── ConversationList.tsx    # Unified direct + group chat list
│   ├── CreateGroupModal.tsx    # New group: name + friend multi-select
│   ├── FriendSelectList.tsx    # Shared checkbox friend-picker (create group / add members)
│   ├── GroupManageModal.tsx    # Rename, members, add-friend shortcut, leave group
│   ├── Header.tsx              # Main app header/nav
│   ├── ImagePreviewModal.tsx   # Preview before sending image attachments
│   ├── LinkPreviewCard.tsx     # Unfurl card rendered under a message's URL
│   ├── MessageBubble.tsx       # One message: quote, text, link preview, images, "edited", deleted placeholder
│   ├── MessageContextMenu.tsx  # Right-click menu: reply, copy, edit, delete for everyone
│   ├── MessageInput.tsx        # Composer: text + image upload, reply and edit bars
│   ├── MessageList.tsx         # Message thread: pagination, sync, changes feed, delete confirmation
│   ├── NewChatModal.tsx        # Start a direct chat with a friend
│   ├── ProtectedRoute.tsx      # Route guard for authenticated pages
│   ├── RootRedirect.tsx        # "/" -> /friends or /login
│   └── ThemeToggle.tsx
├── contexts/
│   ├── AuthContext.tsx         # Source of truth for auth state + current user's profile
│   └── SocketContext.tsx       # Socket lifecycle, tied to auth state
├── hooks/
│   ├── useMessageCache.ts
│   ├── useProfileImageCache.ts
│   └── useSocketListener.ts    # Subscribe to a socket event with auto cleanup
├── pages/
│   ├── admin/
│   │   ├── AddUserModal.tsx    # Create a user directly (with password generator)
│   │   ├── AdminUserPage.tsx   # Route: /admin/users/:userId -- edit, delete messages, delete user
│   │   └── AdminUsersPage.tsx  # Route: /admin -- searchable, paginated user list
│   ├── EditFriendsPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ForgotUsernamePage.tsx
│   ├── FriendListPage.tsx      # Route: /friends -- the chat list page
│   ├── LoginPage.tsx
│   ├── MessagesPage.tsx        # Route: /messages/:conversationId
│   ├── SettingsPage.tsx        # Profile, email/password, delete account
│   └── SignupPage.tsx
├── router/
│   └── AppRouter.tsx
├── services/
│   ├── adminService.ts         # /admin API: list, create, edit, delete users
│   ├── apiClient.ts            # Shared axios instance: auth header, silent token refresh
│   ├── authService.ts          # signup/login/logout, token storage
│   ├── conversationService.ts  # /conversations API (direct + group chat)
│   ├── linkPreviewService.ts   # /link-preview API, client-side response cache
│   ├── messageCacheService.ts  # IndexedDB message cache
│   ├── messageService.ts       # Legacy /messages "clear history" call
│   ├── socketService.ts        # Socket.IO connection + event dispatch
│   └── userService.ts          # /users API: profile, friends, blocking
├── utils/
│   ├── imageLoader.ts          # Authenticated image fetch -> data URL, cached per user
│   ├── imageValidation.ts
│   ├── clientMessageId.ts      # Per-send id so a retried send is never stored twice
│   ├── messageSync.ts          # Applies changes-feed updates; finds messages the server removed
│   ├── profileImageUtils.ts
│   └── urlParser.ts            # URL detection in message text (for links + previews)
├── config.ts
├── App.tsx                     # Provider tree: Mantine -> Auth -> Socket -> Router
└── main.tsx
```

## 🔑 Authentication & Sessions

- On login/signup, the API returns an **access token** (JWT, 7 days) and a **refresh token** (opaque, 14 days, sliding). Both are stored in `localStorage` alongside the user's cached profile fields (`nickname`, `uniqueId`, `email`, `userProfileImage`) — the tokens are the only things that actually need persisting; the profile fields are just an instant-paint hint.
- **`AuthContext`** is the single source of truth for the current user's profile during a session. On mount it paints from the cached hint, then fetches `GET /users/me` in the background and corrects anything stale. Settings-page edits (nickname/uniqueId/email/profile image) go through context methods that update both the in-memory state and the cache — nothing else should read these fields from `localStorage` directly.
- **Silent refresh**: `apiClient`'s response interceptor catches a `401`, calls `POST /auth/refresh` once, retries the original request with the new access token, and only falls back to logging the user out if the refresh itself fails. Concurrent `401`s share a single in-flight refresh instead of each firing their own request.
- **Multi-tab safe**: refresh tokens rotate on every use (one-time use), so two tabs racing a refresh at the same moment could otherwise cause the "losing" tab to wipe out the "winning" tab's freshly-issued tokens. If a refresh call fails, `apiClient` rechecks `localStorage` a moment later — if a sibling tab already rotated in a valid new token, it's used instead of logging out.
- Logout sends the refresh token to `POST /auth/logout` so the server revokes it immediately, rather than just discarding it client-side.

## 🔌 Real-time (Socket.IO)

- `socketService` connects with the access token as `auth: { token }` — no query-string identity is sent.
- A dropped connection is retried for as long as the tab is open (1 second at first, then every 5 seconds at most), so a long API rollout or network outage never leaves a tab without real-time updates.
- Listened-for events (see `useSocketListener`): `conversation:message`, `conversation:memberAdded`, `conversation:memberRemoved`, `conversation:updated`.
- `conversation:message` carries an `action`. For `created` (or no action, as after an admin purge) the open chat refetches the newest page, which also marks it read; for every action it then reads the changes feed (`GET /conversations/:id/messages/changes`) from the cursor saved in IndexedDB. A socket reconnect runs both, to catch anything missed while offline.
- Sending, uploading, editing and deleting send the tab's socket id as `X-Socket-Id`, so the API skips only this tab for the event and the user's other tabs and devices still update. The tab itself shows the message from the API response at once.
- If the handshake is rejected with `"Unauthorized"` (missing, expired or revoked token), the client attempts a silent token refresh and updates the socket's `auth` payload so Socket.IO's own reconnection logic retries with the fresh token. It only logs out if the refresh itself fails.

## 🛡️ Admin

The admin area is for the single account set as `ADMIN_USER_ID` on the API.

- **Access**: `GET /users/me` returns `isAdmin`. `AuthContext` uses it to show the **Admin** link in the header, and `AdminRoute` checks it again before rendering any `/admin` page, sending everyone else to `/friends`. This only shapes the UI; the API refuses every `/admin` call from other accounts.
- **Separate download**: the admin pages are lazy-loaded into their own chunks, so regular users never download them.
- **`/admin`**: users A to Z, 50 per page with **Load more**, and a search box (prefix match on username, unique ID or email). **Add user** opens a form for username, password (with a **Generate password** button), and optional email, unique ID and nickname. A blank email becomes `<username>@users.invalid`, which never receives mail. The new user is added to the admin's friends.
- **`/admin/users/:userId`**: message, group, friend and signed-in device counts; an edit form for username, unique ID, email and a new password (only changed fields are sent); **Delete all messages** (only what this user sent) and **Delete user**. Both deletes require typing the username to confirm.
- Saving an edit signs that user out on every device, so they log in again with the new details. On the admin's own account that includes the admin, and **Delete user** is disabled there.

## 🔗 Services

Each service wraps one area of the API — see [btc2-api's README](https://github.com/beetron/btc2-api#-api-reference) for the exact endpoint list.

| Service | Wraps |
|---|---|
| `authService` | `/auth/*` — signup, login, logout, token storage |
| `userService` | `/users/*` — own profile, friends, block/report |
| `conversationService` | `/conversations/*` — direct + group chat, messages, membership |
| `linkPreviewService` | `/link-preview/*` — URL unfurl metadata, with an in-memory de-dupe cache |
| `messageService` | Legacy `/messages/delete/:id` (clear history) |
| `adminService` | `/admin/*`: list, create, edit and delete users (admin account only) |
| `socketService` | Socket.IO connection lifecycle and event dispatch |

## License

MIT
