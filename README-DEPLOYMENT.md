# WordPath — updated installable web app

## What's changed
- Bible verses are online-only. The app does not download or store Bible text for offline reading.
- The service worker caches the app interface only, so the interface can reopen offline but verse content still needs internet.
- Removed the in-app “Download Bible for offline use” control.
- The “Install app” button hides when running in installed mode and after the install prompt is accepted.
- Set the installed app name to **WordPath** and included launcher icons.
- Kept bookmarks, prayer journal, reading-plan progress, and preferences in local device/browser storage.

## Run locally
Use a local web server rather than opening `index.html` directly:
```bash
python -m http.server 8000
```
Then visit http://localhost:8000.

## Deploy
Upload the contents of this folder to an HTTPS static host such as Netlify, Vercel, or GitHub Pages. Keep all files and the `icons` folder together.

## Important
- Bible chapters require an internet connection.
- The install button is browser-dependent. If the browser does not support the install prompt, the button explains how to install through the browser menu.
- The app name shown under the icon is controlled by the operating system/browser and may take a reinstall or removal/re-add to the home screen to refresh after changing the manifest.
- Bookmarks and journal entries are stored on this device in the current browser profile; they are not synced or backed up.


## Login, registration, and Bible languages

- WordPath now opens on a login screen. A new user can create an account, then sign in. The app shell remains hidden until a valid sign-in succeeds.
- This is a front-end demonstration account system: account records and password hashes are stored in the current browser's local storage, and the signed-in session is held in session storage. It is not production-grade authentication and does not synchronize accounts across devices. For a public production deployment, replace it with a server-side authentication service and database.
- The Bible reader offers English (KJV), Tagalog, and Waray-Waray. English and Tagalog are loaded from the public GetBible catalogue when available. The Waray-Waray selector checks the catalogue; if no complete Waray translation is published there, the reader displays an availability message rather than fabricating Scripture. Connect a licensed/verified Waray-Waray Bible source to enable that option.
- Scripture text is retrieved online, so the reader needs an internet connection. Check each translation's distribution and attribution terms before redistributing its text.
