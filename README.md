# Still — your focus studio

Open **Still.exe** inside the **Still-Windows** folder. Keep the entire folder together; the executable needs the other files beside it. No installation or administrator access is required.

## Find your rhythm

- Choose a plan and click **Start focus**.
- **Customize** lets you add focus intervals and optional breaks in any sequence. Each interval can be 1–240 minutes. Save separate plans for studying, reading, revision, or anything else.
- Add tasks to a running session, check them off, and see your progress. Add default intentions to a saved plan for a fresh checklist every time.
- **Take a break** inserts a 1–60 minute break and preserves your remaining focus time.
- **Pin window** keeps Still above other windows. **Mini timer** opens a compact, always-on-top timer; the main window can be minimized.
- Switch off **Flow between intervals** in Settings to wait for your click before the next interval starts.
- Closing the main app pauses the timer and saves it. On reopening, click Resume. Computer sleep pauses timing instead of counting sleep as study.

## Progress

Insights shows actual focused time, full plans completed, completed tasks, a current streak, a seven-day chart, and session history. Pauses and breaks do not add focus time. Ending a session early still saves its focus time and tasks. Skipping an interval records the plan as ended early rather than a full completion.

A streak means consecutive local calendar days with some focused time; yesterday's streak remains visible until you focus today. The journal shows the most recent 100 sessions, and the backup retains the full history.

## Spotify desktop controls

Click **Open Spotify app**, play a song once in Spotify, then click **Connect desktop player** in Still. Still displays the current track and provides Play/Pause, Previous, and Next controls using Windows media controls. It uses your existing Spotify desktop sign-in; no extra account login is needed. Spotify must remain open.

### Optional embedded playlist

Expand **Add a playlist link / embedded player**, paste a Spotify playlist, album, track, show, or episode link, and click **Save playlist link**. Still saves the link and displays Spotify's official embedded player inside the app. Click the player's controls to play.

This is an embedded player, not a Spotify OAuth account connection. Spotify controls playback availability; Electron may only support previews because Spotify's full music playback requires protected-media support. **Open Spotify** opens the linked content in Spotify's web player for full account playback. Your password is never entered into Still.

## Music & queue

Open **Music & queue** in the sidebar for album artwork, the current song, playback progress, and Previous / Play / Pause / Next controls. Desktop playback works with your existing Spotify app login.

For upcoming songs and **Add to queue** / **Play now**, expand **Setup instructions** in that page:

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create your own developer app with Web API access.
2. Add the exact redirect URI `http://127.0.0.1:17844/callback` in its settings.
3. Copy the public **Client ID**, paste it into Still, and select **Connect Spotify**. Never enter a client secret.
4. Approve Spotify access in your browser. Use a Spotify Premium account allowed by your developer app's user settings, and start playback on a Spotify device.

Still displays the upcoming queue and lets you add a song or episode URL or play a listed item now. Play now may replace the current playback context. Spotify does not expose queue reordering or removal through these APIs; use Spotify for those actions. The page reports connection, device, and account errors.

Spotify account tokens are encrypted using Windows account protection in `data/spotify-auth.enc`. They are excluded from normal plan backups. Disconnect clears the saved authorization. This connection does not require linking Spotify to ChatGPT.

## Website blocking — one-time browser setup

1. Open Still → **Settings & connections** → **Open extension folder**.
2. In Microsoft Edge, open `edge://extensions`. In Chrome, open `chrome://extensions`.
3. Enable **Developer mode**, choose **Load unpacked**, and select the extension folder Still opened.
4. In Still, click **Copy** beside the pairing key.
5. Click the Still extension in the browser toolbar, paste the key, and click **Connect**.
6. Add domains such as `facebook.com` and `instagram.com` to a saved plan. Start that plan.

The extension blocks navigation to the selected domains and their subdomains while a focus interval is running. Whole domains are blocked, even when a pasted URL contains a path. It only affects browsers/profiles where you install it. It does not close or hide pages that were already loaded; reload those pages to apply blocking. It does not block native social-media applications.

State updates within approximately 30 seconds; use **Sync now** in the extension for an immediate update. Pauses, breaks, ending the session, disconnecting, or closing Still clear the rules on the next sync. If the app crashes, rules clear when the extension next checks the connection. Windows/browser suspension can delay syncing until the browser resumes.

The connection is local-only on `127.0.0.1:17843`, protected by a random pairing key. Another program using this port prevents pairing; the app displays an error if this happens. Blocking is a study aid, not a tamper-proof parental-control system.

## Saving and moving your data

Your plans, progress, and settings are stored in `Still-Windows/data/still.json` with a `.bak` recovery copy. Use **Export backup** in Settings before moving or replacing the app. **Restore backup** replaces plans and progress after confirmation and starts with default preferences. It does not restore an active timer or copy a pairing key to another computer. Keep the app in a writable folder.

## Source and checks

The readable source is in `Still-Windows/resources/app` and in the separate `Still` folder. The app has no npm dependencies beyond its included Electron runtime. With Node installed, run `node --test tests/*.test.js` from the source folder to check timer and plan behavior.

References: [Electron BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window), [Spotify embeds](https://developer.spotify.com/documentation/embeds), [Spotify playback troubleshooting](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting), [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest).


## Interval alarms

Still plays a descending alarm when focus ends and a break is ready, an ascending alarm when a break ends and focus is ready, and a completion melody at the end of your plan. Each lasts about five seconds and works while the app is minimized. Settings & connections includes an alarm toggle, saved volume, and preview buttons. With automatic intervals disabled, the alarm marks the boundary and the next interval waits for Resume. Muted Windows audio prevents sound. Closing Still pauses the timer.
