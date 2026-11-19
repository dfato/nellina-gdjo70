# Nellina: private, offline cycle tracker

All data stays on the phone it is entered on. No accounts, no servers, no analytics, no network requests (the page's security policy blocks them).

## Put it on her iPhone (about 5 minutes, free)

You host these files once on GitHub Pages. The host only serves the app's code. It never sees any of her data.

1. On github.com, create a new repository (it can be public; there is nothing personal in the code). Name it anything, for example `nellina`.
2. Upload every file from this folder, keeping the `icons` folder. "Add file > Upload files" works.
3. Repository Settings > Pages > Build from branch > `main` / root > Save.
4. After a minute your site is at `https://YOUR-USERNAME.github.io/nellina/`.
5. On her iPhone, open that link in **Safari** (not Chrome), tap Share > **Add to Home Screen**. She can rename it on that screen.
6. Open it once from the Home Screen icon while online. After that it works fully offline.

## Updating later

If you change any file, edit `VERSION` in `sw.js` (for example `nellina-v2`). Her phone picks up the new version the next time the app is opened online.

## Her data and backups

- Entries live in the app's storage on her phone. Deleting the Home Screen app or clearing Safari website data can erase them.
- Settings > Export encrypted backup creates a password-protected file. Save it to Files or iCloud Drive yourself. Restore from the same screen.
- Make a backup every month or so, and always before iOS major updates or phone changes.

## Notes

- The passcode is a screen lock. The stored data is protected by iPhone encryption, not by the passcode.
- Home screen reminders appear when the app is opened. iOS web apps cannot schedule silent local notifications, so there are no push alerts.
- Predictions are estimates, not medical advice, and not birth control.

## Files

`index.html`, `app.js`, `logic.js` (prediction maths), `styles.css`, `sw.js` (offline cache), `manifest.webmanifest`, `icons/` (home screen icon), `img/` (all the cat sprites, cut out of your sheets).
