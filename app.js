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
  let stepCount = 0, motionEnabled = false, motionTimer = null, lastMotionTime = 0;
  const detector = new window.StepDetector();
  const recorder = new window.RouteRecorder();
  const routeLayers = L.layerGroup().addTo(map);
  const heatLayer = window.createRouteHeatmap();
  let mapView = 'dots';
  function updateHeatStatus() {
    el('heat-status').textContent = recorder.points ? `${recorder.points} accepted dots · Overlap glows brighter · Density changes with zoom` : 'No accepted dots yet. Start recording to build the heatmap.';
  }
  function changeView(view) {
    mapView = view;
    map.closePopup();
    if (view === 'heat') {
      if (map.hasLayer(routeLayers)) map.removeLayer(routeLayers);
      if (!map.hasLayer(heatLayer)) heatLayer.addTo(map);
    } else {
      if (map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
      if (!map.hasLayer(routeLayers)) routeLayers.addTo(map);
    }
    el('heat-legend').hidden = view !== 'heat';
    el('dot-legend-wrap').hidden = view === 'heat';
    updateHeatStatus();
  }
  el('view-dots').addEventListener('change', () => { if (el('view-dots').checked) changeView('dots'); });
  el('view-heat').addEventListener('change', () => { if (el('view-heat').checked) changeView('heat'); });
  let currentFix = null, wakeLock = null, wakePending = false;
  let recordingMode = 'step', intervalSeconds = 5, nextTimeDot = null, intervalValid = true;
  const palette = ['#ccece6', '#8bcbbb', '#459f89', '#216b59', '#103b32'];
  function resetTimeSchedule() { nextTimeDot = intervalValid ? performance.now() + intervalSeconds * 1000 : null; }
  function updateModeUI() {
    el('interval-control').hidden = recordingMode !== 'time';
    el('route-summary').textContent = recordingMode === 'step' ? 'Step Mode · dot every 5 steps' : `Time Mode · dot every ${intervalSeconds} seconds`;
    el('legend-note').textContent = (recordingMode === 'step' ? 'Farther = darker' : 'Closer = darker') + ' · White dot starts a recording segment';
    const colors = recordingMode === 'time' ? [...palette].reverse() : palette;
    const labels = ['0–2 m', '2–5 m', '5–10 m', '10–20 m', '20+ m'];
    el('route-legend').innerHTML = labels.map((label, i) => `<span><i style="background:${colors[i]}"></i>${label}</span>`).join('');
    el('route-legend').setAttribute('aria-label', `Distance from previous dot; ${recordingMode === 'time' ? 'closer' : 'farther'} is darker`);
  }
  function changeMode(mode) {
    recordingMode = mode; recorder.breakSegment(); resetTimeSchedule(); updateModeUI();
    el('route-status').textContent = 'New segment · ' + (mode === 'time' ? `Next dot in ${intervalSeconds} seconds while recording` : 'Next dot at the next multiple of 5 steps');
  }
  el('mode-step').addEventListener('change', () => { if (el('mode-step').checked) changeMode('step'); });
  el('mode-time').addEventListener('change', () => { if (el('mode-time').checked) changeMode('time'); });
  el('time-seconds').addEventListener('input', () => {
    const value = Number(el('time-seconds').value);
    const valid = Number.isInteger(value) && value >= 1 && value <= 300;
    intervalValid = valid;
    el('time-seconds').setCustomValidity(valid ? '' : 'Enter a whole number from 1 to 300.');
    if (!valid) { nextTimeDot = null; el('interval-note').textContent = 'Time sampling paused: enter 1–300 whole seconds.'; return; }
    intervalSeconds = value; resetTimeSchedule(); updateModeUI();
    el('interval-note').textContent = 'Choose 1–300 whole seconds. Timer restarts when changed.';
  });
  setInterval(() => {
    if (!active || document.hidden || recordingMode !== 'time' || nextTimeDot === null) return;
    if (performance.now() >= nextTimeDot) {
      resetTimeSchedule(); // No catch-up burst after browser timer throttling.
      drawRouteDot();
    }
  }, 250);
  function drawRouteDot() {
    const result = recorder.sample(stepCount, currentFix, Date.now(), recordingMode);
    if (!result) return;
    if (!result.accepted) {
      el('route-status').textContent = `${recordingMode === 'step' ? 'Step ' + stepCount : 'Time sample'}: skipped · ${result.reason} · ${recorder.skipped} skipped`;
      return;
    }
    const p = result.point, ll = [p.lat, p.lng];
    heatLayer.addPoint(ll); updateHeatStatus();
    if (result.previous) L.polyline([[result.previous.lat, result.previous.lng], ll], {color:'#287359', weight:3, opacity:0.8}).addTo(routeLayers);
    L.circleMarker(ll, {radius:6, color:'#173d33', weight:1.5, fillColor:result.color, fillOpacity:1})
      .bindPopup(`${p.mode === 'time' ? 'Time Mode' : 'Step Mode'} · ${new Date(p.timestamp).toLocaleTimeString()} · Step ${p.step} · ${result.previous ? result.moved.toFixed(1) + ' m from previous dot' : 'Segment start'} · GPS ±${p.accuracy.toFixed(1)} m`).addTo(routeLayers);
    el('distance').textContent = recorder.total.toFixed(1) + ' m';
    el('route-status').textContent = `${recorder.points} dots · ${recorder.skipped} skipped · ${recordingMode === 'step' ? 'Last dot at step ' + stepCount : 'Last dot at ' + new Date().toLocaleTimeString()}`;
  }
  function releaseWakeLock() {
    const held = wakeLock; wakeLock = null;
    if (held) held.release().catch(() => {});
    el('wake-status').textContent = active ? 'Screen wake lock paused' : 'Screen wake lock off';
  }
  async function requestWakeLock() {
    if (!active || document.hidden || wakePending || (wakeLock && !wakeLock.released)) return;
    if (!navigator.wakeLock) {
      el('wake-status').textContent = 'Keep screen on manually · Wake lock unsupported'; return;
    }
    const token = session;
    wakePending = true;
    try {
      const held = await navigator.wakeLock.request('screen');
      if (!active || token !== session || document.hidden) { await held.release(); return; }
      wakeLock = held;
      el('wake-status').textContent = 'Screen stays awake while recording';
      held.addEventListener('release', () => {
        if (wakeLock !== held) return;
        wakeLock = null;
        el('wake-status').textContent = active ? 'Screen wake lock released · Tap Retry to keep awake' : 'Screen wake lock off';
        el('retry-wake').hidden = !active;
      });
      el('retry-wake').hidden = true;
    } catch (error) {
      if (active && token === session) {
        el('wake-status').textContent = 'Could not keep screen awake · Tap Retry or keep screen on manually';
        el('retry-wake').hidden = false;
      }
    } finally {
      wakePending = false;
      if (active && token !== session && !document.hidden) requestWakeLock();
    }
  }
  el('retry-wake').addEventListener('click', requestWakeLock);
  const motionStatus = text => { el('motion-status').textContent = text; };
  function stopMotion() {
    window.removeEventListener('devicemotion', onMotion);
    clearTimeout(motionTimer); motionTimer = null;
    motionEnabled = false; detector.reset();
    motionStatus('Motion stopped · Step total kept until Reset or reload');
  }
  function onMotion(event) {
    if (!active || !motionEnabled || document.hidden) return;
    const valid = v => v && [v.x, v.y, v.z].every(Number.isFinite);
    const vector = valid(event.accelerationIncludingGravity) ? event.accelerationIncludingGravity : event.acceleration;
    if (!valid(vector)) return;
    const now = performance.now();
    lastMotionTime = now;
    clearTimeout(motionTimer);
    motionStatus('Motion active · Walk with your phone · Estimated steps');
    if (detector.sample(vector, now)) {
      stepCount++;
      el('steps').textContent = stepCount.toLocaleString();
      if (recordingMode === 'step') drawRouteDot();
    }
  }
  function beginMotion(token) {
    // Called synchronously by the Start click: never await GPS before this request.
    const Motion = window.DeviceMotionEvent;
    if (!Motion) { motionStatus('Motion unavailable on this device · GPS still works'); return; }
    motionStatus('Allow motion access if asked…');
    let permission;
    try {
      permission = typeof Motion.requestPermission === 'function' ? Motion.requestPermission() : Promise.resolve('granted');
    } catch (error) { permission = Promise.reject(error); }
    Promise.resolve(permission).then(result => {
      if (!active || token !== session) return;
      if (result !== 'granted') {
        motionStatus('Motion denied · GPS still works. Allow motion in browser settings, then Stop / Start.');
        return;
      }
      detector.reset(); lastMotionTime = 0; motionEnabled = true;
      window.addEventListener('devicemotion', onMotion, {passive:true});
      motionStatus('Waiting for accelerometer… Walk with your phone.');
      motionTimer = setTimeout(() => {
        if (active && token === session && !lastMotionTime) motionStatus('No motion data · Check browser motion permissions and use a supported phone. GPS still works.');
      }, 8000);
    }).catch(() => {
      if (active && token === session) motionStatus('Motion permission failed · GPS still works. Stop / Start to retry in Safari or Chrome.');
    });
  }
  el('reset-steps').addEventListener('click', () => {
    stepCount = 0; el('steps').textContent = '0'; detector.reset();
    recorder.reset(); routeLayers.clearLayers(); heatLayer.clear(); updateHeatStatus(); el('distance').textContent = '0.0 m';
    resetTimeSchedule();
    el('route-status').textContent = 'Route reset · Waiting for the next ' + (recordingMode === 'step' ? '5-step milestone' : 'time interval');
  });
  const icon = L.divIcon({className:'gps-pin', html:'<span></span>', iconSize:[20,20], iconAnchor:[10,10]});
  function buttons() {
    start.disabled = active;
    stop.disabled = !active;
    recenter.disabled = !lastPosition;
    el('mode').textContent = active ? (following ? 'FOLLOWING' : 'EXPLORING') : 'GPS OFF';
  }
  function halt() {
    active = false; nextTimeDot = null;
    session++;
    stopMotion();
    releaseWakeLock(); el('retry-wake').hidden = true;
    currentFix = null; recorder.breakSegment();
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    buttons();
  }
  function receive(position) {
    const {latitude, longitude, accuracy} = position.coords;
    if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 0 || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    lastPosition = [latitude, longitude];
    lastTime = position.timestamp || Date.now();
    currentFix = {lat:latitude, lng:longitude, accuracy, timestamp:position.timestamp};
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
    currentFix = null; recorder.breakSegment(); resetTimeSchedule();
    beginMotion(token);
    requestWakeLock();
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
  document.addEventListener('visibilitychange', () => {
    detector.reset();
    if (!document.hidden) { map.invalidateSize(); requestWakeLock(); resetTimeSchedule(); }
    else { releaseWakeLock(); currentFix = null; recorder.breakSegment(); }
    if (motionEnabled) motionStatus(document.hidden ? 'Motion paused while app is hidden' : 'Motion resumed · Walk with your phone · Estimated steps');
  });
  window.addEventListener('resize', () => map.invalidateSize());
  window.addEventListener('pagehide', halt);
})();
