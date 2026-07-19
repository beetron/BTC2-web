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
- [🔗 Services](#-services)

## ✨ Features

- **Unified chat list**: direct and group conversations in one list, with unread badges and last-activity time
- **Group chat**: create groups, rename, manage members (add/remove/leave), role-aware UI (owner/admin/member)
- **Add Friend from a group**: a non-friend group member can be sent a friend request right from the group settings modal
- **Cursor-paginated messages**: older history loads as you scroll up, scroll position preserved
- **Image messages**: attach and preview images in any conversation
- **Link previews**: a small unfurl card (image/title/description) renders under any message containing a URL
- **Friend management**: add, accept/reject requests, block/unblock, report
- **Persistent sessions**: silent access-token refresh in the background — no forced re-login as long as the app is used at least once every 14 days
- **Dark/Light theme** toggle
- **Responsive design**: desktop and mobile
- **Offline-friendly message cache** (IndexedDB) for instant paint on reopen

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

- Node.js 18+
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
│   ├── AuthHeader.tsx          # Header shown on login/signup/forgot-* pages
│   ├── ConversationList.tsx    # Unified direct + group chat list
│   ├── CreateGroupModal.tsx    # New group: name + friend multi-select
│   ├── FriendSelectList.tsx    # Shared checkbox friend-picker (create group / add members)
│   ├── GroupManageModal.tsx    # Rename, members, add-friend shortcut, leave group
│   ├── Header.tsx              # Main app header/nav
│   ├── ImagePreviewModal.tsx   # Preview before sending image attachments
│   ├── LinkPreviewCard.tsx     # Unfurl card rendered under a message's URL
│   ├── MessageInput.tsx        # Composer: text + image upload
│   ├── MessageList.tsx         # Message thread: pagination, images, link previews
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
- Listened-for events (see `useSocketListener`): `conversation:message`, `conversation:memberAdded`, `conversation:memberRemoved`, `conversation:updated`, plus the legacy `newMessageSignal`.
- If the handshake is rejected with `"Unauthorized"` (the API's `SOCKET_REQUIRE_AUTH` flag), the client attempts a silent token refresh and updates the socket's `auth` payload so Socket.IO's own reconnection logic retries with the fresh token — it only logs out if the refresh itself fails. This means the app is ready for the API to enforce `SOCKET_REQUIRE_AUTH=true` with no frontend changes required.

## 🔗 Services

Each service wraps one area of the API — see [btc2-api's README](https://github.com/beetron/btc2-api#-api-reference) for the exact endpoint list.

| Service | Wraps |
|---|---|
| `authService` | `/auth/*` — signup, login, logout, token storage |
| `userService` | `/users/*` — own profile, friends, block/report |
| `conversationService` | `/conversations/*` — direct + group chat, messages, membership |
| `linkPreviewService` | `/link-preview/*` — URL unfurl metadata, with an in-memory de-dupe cache |
| `messageService` | Legacy `/messages/delete/:id` (clear history) |
| `socketService` | Socket.IO connection lifecycle and event dispatch |

## License

MIT
