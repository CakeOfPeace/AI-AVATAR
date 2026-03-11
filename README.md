# Duix Avatar Frontend

A sleek dark mode frontend for Duix Avatar SDK integration.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables by creating a `.env` file:
```
VITE_DUIX_SIGN=your_sign_here
VITE_DUIX_CONVERSATION_ID=your_conversation_id_here
VITE_DUIX_PLATFORM=duix.com
```

3. Start the development server:
```bash
npm run dev
```

## Features

- Full-screen avatar video rendering
- Text chat interaction with the avatar
- Voice recognition (ASR) support
- Real-time subtitles for avatar speech
- Network quality monitoring
- Session controls (start/stop, mute, interrupt)

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- Shadcn UI components
- duix-guiji-light SDK

## Project Structure

```
src/
├── components/
│   ├── ui/              # Shadcn UI components
│   ├── AvatarView.jsx   # Video container
│   ├── ControlBar.jsx   # Session controls
│   ├── ChatPanel.jsx    # Text chat interface
│   ├── Subtitles.jsx    # Speech display
│   └── StatsOverlay.jsx # Network stats
├── hooks/
│   └── useDuix.js       # SDK hook
├── lib/
│   └── utils.js         # Utilities
├── App.jsx
├── main.jsx
└── index.css
```
