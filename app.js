/* Route Lab — no build tools or external JavaScript dependencies beyond bundled Leaflet. */
(() => {
  'use strict';
  const el = id => document.getElementById(id);
  const start = el('start'), stop = el('stop'), recenter = el('recenter');
  const status = (title, message, kind = '') => {
    el('status').textContent = title;
    el('message').textContent = message;
    el('dot').className = 'dot ' + kind;
  };
  if (!window.L) {
    status('Map could not load', 'Reload the page. Make sure the vendor folder was uploaded with index.html.', 'error');
    start.disabled = true;
    return;
  }
  const map = L.map('map', {zoomControl: true}).setView([20, 0], 2);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }).addTo(map);
  let tileFailed = false;
  tiles.on('tileerror', () => {
    if (!tileFailed) {
      tileFailed = true;
      el('updated').textContent = 'Map tiles unavailable. Check your connection; GPS can still update.';
    }
  });
  let watchId = null, session = 0, active = false, following = true;
  let marker, accuracyCircle, lastPosition, lastTime = 0, firstFix = true;
  const icon = L.divIcon({className:'gps-pin', html:'<span></span>', iconSize:[20,20], iconAnchor:[10,10]});
  function buttons() {
    start.disabled = active;
    stop.disabled = !active;
    recenter.disabled = !lastPosition;
    el('mode').textContent = active ? (following ? 'FOLLOWING' : 'EXPLORING') : 'GPS OFF';
  }
  function halt() {
    active = false;
    session++;
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    buttons();
  }
  function receive(position) {
    const {latitude, longitude, accuracy} = position.coords;
    if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 0 || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    lastPosition = [latitude, longitude];
    lastTime = position.timestamp || Date.now();
    el('latitude').textContent = latitude.toFixed(6);
    el('longitude').textContent = longitude.toFixed(6);
    el('accuracy').textContent = accuracy.toFixed(1);
    if (!marker) {
      accuracyCircle = L.circle(lastPosition, {radius:accuracy, color:'#287359', weight:1, fillColor:'#439b73', fillOpacity:0.12, interactive:false}).addTo(map);
      marker = L.marker(lastPosition, {icon, title:'Your current GPS location', keyboard:false}).addTo(map);
    } else {
      marker.setLatLng(lastPosition);
      accuracyCircle.setLatLng(lastPosition).setRadius(accuracy);
    }
    if (following) map.setView(lastPosition, firstFix ? 17 : map.getZoom(), {animate:false});
    firstFix = false;
    status('Location is live', following ? 'The map follows you. The shaded circle shows your GPS accuracy.' : 'Explore the map freely. Tap ◎ to follow your location again.', 'live');
    if (!tileFailed) el('updated').textContent = 'Updated ' + new Date(lastTime).toLocaleTimeString() + ' · Location stays in this tab.';
    buttons();
  }
  start.addEventListener('click', () => {
    if (active) return;
    if (!window.isSecureContext) {
      status('HTTPS is required', 'Open your published HTTPS GitHub Pages URL to use GPS.', 'error'); return;
    }
    if (!navigator.geolocation) {
      status('Location is unavailable', 'Open this page in Safari on iPhone or Chrome on Android with location enabled.', 'error'); return;
    }
    active = true; following = true; firstFix = true; lastTime = 0;
    const token = ++session;
    buttons();
    status('Finding your location…', 'Allow location access when asked. For a better fix, move near a window or outdoors.');
    try {
      watchId = navigator.geolocation.watchPosition(
        p => { if (active && token === session) receive(p); },
        error => {
          if (!active || token !== session) return;
          if (error.code === 1) {
            halt();
            status('Location permission denied', 'Allow location for this site in your browser settings, then tap Start again.', 'error');
          } else {
            status(error.code === 3 ? 'Still finding a GPS signal' : 'GPS signal unavailable', 'Waiting for location. Check device Location Services and your connection. You can Stop and try again.', 'error');
          }
        },
        {enableHighAccuracy:true, maximumAge:0, timeout:20000}
      );
    } catch (error) {
      halt(); status('Could not start GPS', 'Check location permissions and open this page directly in your browser, then try again.', 'error');
    }
  });
  stop.addEventListener('click', () => {
    halt();
    status('Tracking stopped', 'Your last position remains on the map. Tap Start to resume live GPS.');
  });
  map.on('dragstart', () => {
    if (!active) return;
    following = false; buttons();
    status('Exploring the map', 'GPS keeps updating. Tap ◎ to recenter and follow your location.');
  });
  recenter.addEventListener('click', () => {
    if (!lastPosition) return;
    following = true;
    map.setView(lastPosition, Math.max(map.getZoom(), 16), {animate:false});
    buttons();
    if (active) status('Following your location', 'The map follows new GPS updates. The shaded circle shows accuracy.', 'live');
  });
  setInterval(() => {
    if (active && lastTime && Date.now() - lastTime > 30000) {
      status('Waiting for a fresh GPS fix', 'The displayed position is the last known fix. Keep the app visible and check Location Services.');
    }
  }, 5000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) map.invalidateSize(); });
  window.addEventListener('resize', () => map.invalidateSize());
  window.addEventListener('pagehide', halt);
})();
