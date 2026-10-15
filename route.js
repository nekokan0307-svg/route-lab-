/* Route sampling and distance calculations, independent of map rendering. */
(() => {
  'use strict';
  const colors = ['#ccece6', '#8bcbbb', '#459f89', '#216b59', '#103b32'];
  const colorFor = metres => colors[metres < 2 ? 0 : metres < 5 ? 1 : metres < 10 ? 2 : metres < 20 ? 3 : 4];
  function distance(a, b) {
    const rad = x => x * Math.PI / 180;
    const dlat = rad(b.lat - a.lat), dlon = rad(b.lng - a.lng);
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dlon / 2) ** 2;
    return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  }
  class RouteRecorder {
    constructor() { this.reset(); }
    reset() { this.total = 0; this.points = 0; this.skipped = 0; this.breakSegment(); }
    breakSegment() { this.previous = null; this.lastTimestamp = null; }
    sample(step, fix, now, mode = 'step') {
      if (mode === 'step' && step % 5 !== 0) return null;
      let reason = '';
      if (!fix) reason = 'No GPS fix yet';
      else if (![fix.lat, fix.lng, fix.accuracy, fix.timestamp].every(Number.isFinite) || Math.abs(fix.lat) > 90 || Math.abs(fix.lng) > 180 || fix.accuracy < 0) reason = 'Invalid GPS fix';
      else if (fix.accuracy > 20) reason = 'GPS accuracy is worse than 20 m';
      else if (now - fix.timestamp > 10000 || fix.timestamp > now + 1000) reason = 'GPS fix is not fresh (10 s maximum)';
      else if (this.lastTimestamp !== null && fix.timestamp <= this.lastTimestamp) reason = 'Waiting for a new GPS fix';
      if (reason) { this.skipped++; return {accepted:false, reason}; }
      const previous = this.previous;
      const moved = previous ? distance(previous, fix) : 0;
      const point = {...fix, step, mode};
      this.total += moved; this.points++; this.previous = point; this.lastTimestamp = fix.timestamp;
      return {accepted:true, point, previous, moved, color:previous ? (mode === 'time' ? colors[4 - colors.indexOf(colorFor(moved))] : colorFor(moved)) : '#ffffff'};
    }
  }
  window.RouteRecorder = RouteRecorder;
})();
