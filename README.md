# Route Lab

A mobile-first live GPS map with an accelerometer step counter using Leaflet 1.9.4 and OpenStreetMap. Plain HTML/CSS/JS, with no build step, API key, backend, or account required.

## Publish on GitHub Pages

1. Extract this ZIP.
2. Upload the **contents** of `route-lab` to the root of your GitHub repository: `index.html`, `styles.css`, `app.js`, `vendor`, and the other included files. Keep the folder structure intact.
3. In the repository, open **Settings → Pages**. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. Open the HTTPS Pages URL after deployment. On your phone, tap **Start** and allow location access.

Works at a repository subpath, such as `https://your-name.github.io/route-lab/`. All local asset references are relative. The HTTPS OpenStreetMap tile URL and attribution links are external services, as required to display a live map.

## Use

- **Start** requests motion permission directly inside the tap handler on iPhone, and begins a high-accuracy `watchPosition` GPS session. Android browsers without `requestPermission` listen for accelerometer events without an extra prompt. GPS is not blocked by denied or unavailable motion access.
- Your marker and the accuracy circle update on each GPS fix. Accuracy is the browser-reported estimate in metres, not a guarantee of precision. Latitude/longitude are decimal degrees.
- The map follows new fixes automatically. Dragging pauses map following while GPS continues; tap **◎** to recenter and follow again.
- **Stop** clears the GPS watch and removes the accelerometer listener. It retains the last fix and step total. Start resumes counting; **Reset** clears the step count. Reloading resets the total to zero.
- **Steps** are shown in large numbers and estimated from accelerometer magnitude using time-based smoothing, gravity/baseline removal, peak hysteresis, an 800 ms warm-up, and a 300 ms minimum step interval. Carry the phone consistently while walking. Shaking or other motion may count as steps, and gentle steps may be missed. This is not a native Health/Fitness step count.
- A separate motion status reports denied access, unavailable sensors, or no data; GPS status remains independent.
- Permission, timeout, unsupported browser, insecure context, and tile-loading errors have visible guidance.

## iPhone and Android

Use Safari on iPhone or Chrome on Android; enable device Location Services and allow the site's location permission (and Precise Location where available). Open the HTTPS URL directly, rather than inside another app's embedded browser. On iPhone, allow **Motion & Orientation** when Start requests it. If denied, check Safari/site motion settings and Stop / Start to retry. On Android, allow motion sensors in site settings if restricted. Keep the page visible and the screen awake: mobile browsers may suspend GPS in the background or while locked. Tracking stops when the page is left; tap Start on return.

Map tiles require internet. The app does not save or upload coordinates, step totals, or accelerometer data. Your browser contacts OpenStreetMap for the map tiles around the viewed location; those requests reveal the viewed map area to the tile provider. No offline caching or tile prefetching is implemented. OpenStreetMap's standard tile service has usage limits; review https://operations.osmfoundation.org/policies/tiles/ before a large public rollout.

## Manual verification on a real phone

1. Before Start, confirm no location prompt appears.
2. Start, grant permission, check latitude, longitude, accuracy and a centered marker.
3. Walk outdoors; confirm new readings, marker movement, and following.
4. Pan the map, then recenter. Stop and confirm no further updates.
5. Deny permission and confirm the recovery message. Re-enable permission and retry.
6. Allow motion permission, walk 20–30 steps with the phone, and compare the estimate. Stop and verify the count freezes; Start and walk again. Reset the total. Deny motion and confirm GPS remains active.
7. Rotate the phone; confirm controls and map remain usable. Background and resume; check the status and restart if needed.

GPS hardware and permission behavior need real-device testing. This package has not been tested on physical iPhone/Android hardware.

## Dependencies

Leaflet 1.9.4 is bundled in `vendor/leaflet` under its BSD-2-Clause license. Map data © OpenStreetMap contributors. Attribution stays visible on the map.

## Validation of this update

JavaScript syntax and simulated GPS/motion tests passed: permission invocation on Start, Android no-prompt path, denied-motion GPS continuity, walking cycles versus stationary noise, Stop/Reset, and delayed permission after Stop. Physical sensor accuracy and layout still require real-device verification.

## Route recording (version 3)

Every fifth detected step (5, 10, 15, …), Route Lab samples the latest GPS fix. Only fixes with reported accuracy ≤20 metres, age ≤10 seconds, valid coordinates, and a timestamp newer than the previous accepted dot are used. A skipped milestone is not backfilled; the next attempt is five steps later. Steps continue counting regardless of GPS quality. The live location marker still shows all valid fixes; quality filtering applies to route dots and distance.

Accepted dots are linked by straight lines. Distance is the sum of those lines using great-circle distances, in metres; it is not GPS distance on every update or steps multiplied by stride length. GPS drift can inflate distance and gaps or turns between dots can underestimate it. A 20 m accuracy cutoff does not make short walking distances precise.

Dot colour means distance from the previous accepted dot: pale teal 0–<2 m, then 2–<5 m, 5–<10 m, 10–<20 m, and darkest green ≥20 m. The first dot in each segment is white and adds no distance. Tap a dot for step number, distance and GPS accuracy.

Stop keeps totals and dots. Start resumes the total step counter, with a new route segment so movement while stopped is excluded. Hiding the page also breaks the segment and clears the old GPS fix, avoiding a distance jump when returning. Reset all clears steps, dots, distance and skipped-fix counts. Reload clears all session data.

Screen Wake Lock is requested on Start, released on Stop/page exit, and requested again when returning to the visible page. A status reports success, lack of browser support or a system refusal; Retry is offered on refusal or release. Keep the page visible; wake lock does not enable background or locked-screen recording and can be revoked by the device (for example in low-power mode). Use a recent Safari/Chrome browser over HTTPS.

Upload every file, including the new `route.js`. Local CSS/JS references have a version query to refresh cached assets. No build step is required.

Route sampling, quality rejection, colour bins, distance accumulation, segment breaks, reset, and wake-lock lifecycle passed simulated checks. Physical-phone accuracy and browser layout have not been verified.

## Step Mode and Time Mode (version 4)

Select **Step Mode** for a GPS sample every 5 counted steps; farther dots are darker. Select **Time Mode** for a GPS sample every chosen number of seconds (default 5; whole numbers 1–300); closer dots are darker. The legend updates to the selected mode. Step counting, GPS filtering, distance totals, map following and screen wake lock work in both modes. Time Mode can record even when motion permission is denied.

The first Time Mode sample is after one full interval. Changing the interval restarts its countdown. An invalid or empty interval pauses time sampling until corrected. Switching modes starts a new route segment, keeping previous dots and totals; each dot's popup identifies its mode. Earlier dots retain their original colour meaning. The first dot of a new segment is white and adds no distance.

Time sampling pauses when stopped or hidden. Returning to the page starts a fresh countdown and segment. Browser timers are approximate; delayed intervals do not create catch-up dots. Quality checks still apply on each attempt: GPS accuracy ≤20 m, fix age ≤10 seconds, and a newer GPS timestamp than the last accepted dot. Skipped attempts are not backfilled. Reset all clears the route and steps and restarts the countdown.

Deploy the whole package, including `route.js`, and refresh the page. Versioned relative CSS/JS URLs request the latest assets without a build step.

Version 4 simulated checks passed for timer intervals, interval edits and invalid input, mode switching, reversed time colour bins, GPS quality filtering, and the existing motion/wake-lock lifecycle. Physical phone testing is still required.

## Dots and Heatmap (version 5)

Use the **Map view** switch at the top of the control panel:

- **Dots** shows the original route dots, connections and mode-dependent distance legend. Tap dots for details.
- **Heatmap** hides the route dots/lines and displays a canvas glow from all accepted recorded dots, across both recording modes and segments. Each dot has equal weight; nearby dots overlap and become brighter, progressing from blue/teal to yellow/cream. The heat legend describes density rather than movement distance. The live GPS marker and accuracy circle remain available.

The heat overlay updates during recording and redraws after map movement, zooming and resizing. A dot contributes over a 28-screen-pixel radius, so apparent density changes with map zoom. It is a visual density estimate, not an area-normalized scientific heatmap. Its brightness uses a fixed saturating scale: adding overlapping dots increases brightness without dimming other areas.

Switching the map view does not change the recording mode, timer, step count, accepted-dot history, route segments, distance total or wake lock. Data continues accumulating in both views. Stop retains both views; Reset all clears both. GPS fixes rejected by the existing filters do not contribute to heat. An empty-state message appears before any dots are accepted.

The heatmap renderer is included locally in `heatmap.js`; no plugin download, API key, build step or extra remote dependency is required. Upload **all files**, including `heatmap.js`, then refresh the page.

Version 5 simulated checks passed for view switching, ongoing recording and data preservation, reset, empty/offscreen heat, brighter overlapping dots, layer reattachment and redraw, and existing Step/Time/GPS/wake-lock behavior. Real-device display and sensor testing remain unverified.
