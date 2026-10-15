/* Accelerometer peak detector. Counts are estimates, not native health data. */
(() => {
  'use strict';
  class StepDetector {
    constructor() { this.reset(); }
    reset() {
      this.baseline = null; this.filtered = 0; this.lastSample = null;
      this.warmUntil = 0; this.lastStep = -Infinity; this.armed = true;
    }
    sample(vector, time) {
      if (!vector || ![vector.x, vector.y, vector.z].every(Number.isFinite) || !Number.isFinite(time)) return false;
      const magnitude = Math.hypot(vector.x, vector.y, vector.z);
      if (this.lastSample === null || time - this.lastSample > 1000 || time < this.lastSample) {
        this.baseline = magnitude; this.filtered = 0; this.warmUntil = time + 800;
        this.lastSample = time; this.armed = true;
        return false;
      }
      const dt = Math.max(1, time - this.lastSample);
      this.lastSample = time;
      // Time-based filters tolerate different Android/iPhone event rates.
      this.baseline += (1 - Math.exp(-dt / 650)) * (magnitude - this.baseline);
      this.filtered += (1 - Math.exp(-dt / 65)) * (magnitude - this.baseline - this.filtered);
      if (time < this.warmUntil) return false;
      if (this.filtered < 0.25) this.armed = true;
      if (this.armed && this.filtered > 1.15) {
        this.armed = false;
        if (time - this.lastStep >= 300) { this.lastStep = time; return true; }
      }
      return false;
    }
  }
  window.StepDetector = StepDetector;
})();
