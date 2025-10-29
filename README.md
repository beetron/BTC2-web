# BTC2 (web version)

A modern React chat application built with Vite and Mantine, designed to work with the BTC2-API backend.

## Features

- ✨ **Authentication**: Login, Signup, Forgot Username, Forgot Password
- 💬 **Real-time Messaging**: Send and receive messages with friends
- 👥 **Friend Management**: Add, accept, and manage friend requests
- 🌓 **Dark/Light Theme**: Toggle between dark and light modes
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔐 **JWT Authentication**: Secure token-based authentication

## Tech Stack

- **Frontend Framework**: React 18
- **Build Tool**: Vite
- **UI Library**: Mantine
- **HTTP Client**: Axios
- **Icons**: Tabler Icons
- **Routing**: React Router
- **Real-time**: Socket.IO Client
- **Language**: TypeScript

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd btc2-web
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` to match your backend API URLs:

```
VITE_API_URL_DEV=http://localhost:3000
VITE_API_URL_PROD=https://api.com
```

## Development

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Building

Build for production:

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── FriendList.tsx
│   ├── MessageInput.tsx
│   ├── MessageList.tsx
│   ├── ProtectedRoute.tsx
│   └── ThemeToggle.tsx
├── contexts/            # React contexts for state management
│   └── AuthContext.tsx
├── pages/               # Page components
│   ├── ChatPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ForgotUsernamePage.tsx
│   ├── LoginPage.tsx
│   └── SignupPage.tsx
├── router/              # Router configuration
│   └── AppRouter.tsx
├── services/            # API services
│   ├── authService.ts
│   ├── messageService.ts
│   └── userService.ts
├── config.ts            # Configuration (environment variables)
├── App.tsx              # Main app component
├── main.tsx             # Entry point
└── index.css            # Global styles
```

## Environment Configuration

The application automatically switches between development and production based on `NODE_ENV`:

- **Development**: Uses `VITE_API_URL_DEV` (default: http://localhost:3000)
- **Production**: Uses `VITE_API_URL_PROD` (default: https://api.com)

## API Integration

The application is designed to work with the BTC2-API backend. All endpoints are supported:

### Authentication

- POST `/auth/signup` - Create new account
- POST `/auth/login` - Login user
- POST `/auth/logout` - Logout user
- GET `/auth/forgotusername` - Request username
- GET `/auth/forgotpassword` - Request password reset

### Users

- GET `/users/profileImage/:filename` - Get profile image
- GET `/users/friendlist` - Get friend list
- GET `/users/friendrequests` - Get friend requests
- PUT `/users/addfriend/:uniqueId` - Send friend request
- PUT `/users/acceptfriend/:uniqueId` - Accept friend request
- PUT `/users/rejectfriend/:uniqueId` - Reject friend request
- PUT `/users/removefriend/:uniqueId` - Remove friend
- PUT `/users/changepassword` - Change password
- PUT `/users/updatenickname/:nickname` - Update nickname
- PUT `/users/updateuniqueid/:uniqueId` - Update unique ID
- PUT `/users/updateprofileimage/` - Update profile image
- PUT `/users/updateemail` - Update email
- PUT `/users/fcm/register` - Register FCM token
- DELETE `/users/fcm/token` - Delete FCM token

### Messages

- POST `/messages/send/:id` - Send message
- GET `/messages/get/:id` - Get conversation history
- DELETE `/messages/delete/:id` - Delete messages

## License

MIT
