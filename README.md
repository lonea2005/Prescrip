# Prescrip

PWA for iOS - A countdown timer app with Working and Rest phases.

## Features

- **Progressive Web App (PWA)**: Install on iOS home screen and use like a native app
- **Two Phase System**:
  - **Working Phase**: 8-hour countdown timer
  - **Rest Phase**: 20-hour countdown timer
- **Persistent State**: Timer continues even when app is closed
- **Score Tracking**: 
  - Starts at 100
  - +10 points when Done button is pressed
  - -30 points when Fail button is pressed
  - Score persists across sessions
- **Offline Support**: Works without internet connection via Service Worker

## How It Works

1. **First Launch**: App starts in Working phase with 8-hour timer
2. **Working Phase**:
   - Timer counts down from 8 hours
   - Two buttons visible: Done and Fail
   - Pressing Done or Fail transitions to Rest phase and updates score
   - Timer expiration automatically transitions to Rest phase
3. **Rest Phase**:
   - Timer counts down from 20 hours
   - Buttons are hidden
   - Timer expiration automatically transitions to Working phase
4. **State Persistence**: All state (phase, timer, score) is saved in localStorage

## Installation on iOS

1. Open the app in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app will now appear on your home screen like a native app

## Technical Details

- **HTML/CSS/JavaScript**: Pure vanilla implementation, no frameworks
- **Service Worker**: Provides offline functionality
- **localStorage**: Persists app state across sessions
- **PWA Manifest**: Enables installation on iOS devices

## Files

- `index.html` - Main HTML structure
- `style.css` - Styling and responsive design
- `app.js` - Application logic and state management
- `service-worker.js` - Offline functionality
- `manifest.json` - PWA configuration
- `icon-192.png`, `icon-512.png` - App icons