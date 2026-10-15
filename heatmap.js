/* Local canvas heat overlay. Every accepted dot has equal weight. */
(() => {
  'use strict';
  function heatPixels(points, width, height, cellSize = 4, radius = 28) {
    const w = Math.max(1, Math.ceil(width / cellSize));
    const h = Math.max(1, Math.ceil(height / cellSize));
    const density = new Float32Array(w * h);
    const r = radius / cellSize;
    // Aggregate dots that project into the same grid cell before splatting.
    const bins = new Map();
    for (const p of points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
      const x = Math.floor(p.x / cellSize), y = Math.floor(p.y / cellSize);
      if (x < -r || y < -r || x > w + r || y > h + r) continue;
      const key = `${x},${y}`;
      const bin = bins.get(key);
      if (bin) bin.count++; else bins.set(key, {x, y, count:1});
    }
    for (const {x, y, count} of bins.values()) {
      for (let yy = Math.max(0, Math.floor(y-r)); yy <= Math.min(h-1, Math.ceil(y+r)); yy++) {
        for (let xx = Math.max(0, Math.floor(x-r)); xx <= Math.min(w-1, Math.ceil(x+r)); xx++) {
          const d2 = ((xx-x)**2 + (yy-y)**2) / (r*r);
          if (d2 <= 1) density[yy*w+xx] += count * Math.exp(-d2*4);
        }
      }
    }
    const data = new Uint8ClampedArray(w*h*4);
    for (let i=0; i<density.length; i++) {
      const d = density[i];
      if (d < 0.025) continue;
      // Fixed scale: extra overlapping dots increase brightness, without rescaling other areas.
      const t = 1-Math.exp(-d/5);
      const stops = [[30,110,190],[40,210,195],[255,220,90],[255,255,235]];
      const pos = t*3, a = Math.min(2,Math.floor(pos)), f = pos-a;
      for (let c=0;c<3;c++) data[i*4+c] = stops[a][c]*(1-f)+stops[a+1][c]*f;
      data[i*4+3] = 230*(1-Math.exp(-d*.42));
    }
    return {width:w,height:h,data};
  }
  window.RouteHeatPixels = heatPixels;
  window.createRouteHeatmap = function () {
    const HeatLayer = L.Layer.extend({
      initialize() { this._points=[]; },
      onAdd(map) {
        this._map=map;
        this._canvas=L.DomUtil.create('canvas','route-heat-canvas leaflet-zoom-hide');
        this._canvas.setAttribute('aria-hidden','true');
        map.getPanes().overlayPane.appendChild(this._canvas);
        map.on('moveend zoomend resize',this.redraw,this);
        this.redraw();
      },
      onRemove(map) {
        map.off('moveend zoomend resize',this.redraw,this);
        this._canvas.remove(); this._canvas=null; this._map=null;
      },
      addPoint(latlng) { this._points.push(latlng); return this.redraw(); },
      clear() { this._points=[]; return this.redraw(); },
      redraw() {
        if (!this._map || !this._canvas) return this;
        const size=this._map.getSize();
        const frame=heatPixels(this._points.map(p=>this._map.latLngToContainerPoint(p)),size.x,size.y);
        const canvas=this._canvas;
        canvas.width=frame.width;canvas.height=frame.height;
        canvas.style.width=size.x+'px';canvas.style.height=size.y+'px';
        L.DomUtil.setPosition(canvas,this._map.containerPointToLayerPoint([0,0]));
        const ctx=canvas.getContext('2d');
        if (ctx) { const img=ctx.createImageData(frame.width,frame.height);img.data.set(frame.data);ctx.putImageData(img,0,0); }
        return this;
      }
    });
    return new HeatLayer();
  };
})();
