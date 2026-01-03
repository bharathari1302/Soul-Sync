# Soul Sync

A real-time compatibility game for couples or friends, inspired by Kahoot and The Newlywed Game.

## Firebase Setup (Required)

1.  **Create a Firebase Project**:
    *   Go to [Firebase Console](https://console.firebase.google.com/).
    *   Add a new project "Soul Sync".
    *   Enable **Authentication** (Email/Password).
    *   Enable **Firestore Database**.
    *   (Optional) Enable **Hosting**.

2.  **Get Credentials**:
    *   Go to Project Settings > General > Your Apps > Add Web App.
    *   Copy the `firebaseConfig` object.

3.  **Update Config**:
    *   Open `client/src/firebase.js`.
    *   Paste your config keys there.

## Hosting & Deployment

1.  **Install Firebase CLI**: `npm install -g firebase-tools`
2.  **Login**: `firebase login`
3.  **Initialize**:
    *   Run `firebase init` in the root folder.
    *   Select **Hosting** and **Firestore**.
    *   Public directory: `client/dist` (after running `npm run build` in client).
    *   Configure as single-page app: **Yes**.
4.  **Deploy**:
    *   `cd client && npm run build`
    *   `firebase deploy`
    
    *Note*: For the backend (Socket.io), you still need a Node.js host (like Render, Railway, or Heroku) OR refill logic to use Firestore listeners exclusively if you want full serverless. Currently, the purely serverless version is implemented for Auth/Storage, but real-time sync still relies on the included Node.js server.

## Uploading Questions (PDF)
*   The Admin Dashboard supports importing Text-based PDFs.
*   It will parse lines as questions automatically.

## Running Locally

1.  **Start Server**: `cd server && node index.js`
2.  **Start Client**: `cd client && npm run dev`
