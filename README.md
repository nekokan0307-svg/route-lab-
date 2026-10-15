# Route Lab

A mobile-first live GPS map using Leaflet 1.9.4 and OpenStreetMap. Plain HTML/CSS/JS, with no build step, API key, backend, or account required.

## Publish on GitHub Pages

1. Extract this ZIP.
2. Upload the **contents** of `route-lab` to the root of your GitHub repository: `index.html`, `styles.css`, `app.js`, `vendor`, and the other included files. Keep the folder structure intact.
3. In the repository, open **Settings → Pages**. Choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
4. Open the HTTPS Pages URL after deployment. On your phone, tap **Start** and allow location access.

Works at a repository subpath, such as `https://your-name.github.io/route-lab/`. All local asset references are relative. The HTTPS OpenStreetMap tile URL and attribution links are external services, as required to display a live map.

## Use

- **Start** begins a high-accuracy `watchPosition` session only after a tap.
- Your marker and the accuracy circle update on each GPS fix. Accuracy is the browser-reported estimate in metres, not a guarantee of precision. Latitude/longitude are decimal degrees.
- The map follows new fixes automatically. Dragging pauses map following while GPS continues; tap **◎** to recenter and follow again.
- **Stop** clears the GPS watch and retains the last fix, clearly labeled as stopped.
- Permission, timeout, unsupported browser, insecure context, and tile-loading errors have visible guidance.

## iPhone and Android

Use Safari on iPhone or Chrome on Android; enable device Location Services and allow the site's location permission (and Precise Location where available). Open the HTTPS URL directly, rather than inside another app's embedded browser. No special iOS motion permission is needed. Keep the page visible and the screen awake: mobile browsers may suspend GPS in the background or while locked. Tracking stops when the page is left; tap Start on return.

Map tiles require internet. The app does not save or upload coordinates. Your browser contacts OpenStreetMap for the map tiles around the viewed location; those requests reveal the viewed map area to the tile provider. No offline caching or tile prefetching is implemented. OpenStreetMap's standard tile service has usage limits; review https://operations.osmfoundation.org/policies/tiles/ before a large public rollout.

## Manual verification on a real phone

1. Before Start, confirm no location prompt appears.
2. Start, grant permission, check latitude, longitude, accuracy and a centered marker.
3. Walk outdoors; confirm new readings, marker movement, and following.
4. Pan the map, then recenter. Stop and confirm no further updates.
5. Deny permission and confirm the recovery message. Re-enable permission and retry.
6. Rotate the phone; confirm controls and map remain usable. Background and resume; check the status and restart if needed.

GPS hardware and permission behavior need real-device testing. This package has not been tested on physical iPhone/Android hardware.

## Dependencies

Leaflet 1.9.4 is bundled in `vendor/leaflet` under its BSD-2-Clause license. Map data © OpenStreetMap contributors. Attribution stays visible on the map.
