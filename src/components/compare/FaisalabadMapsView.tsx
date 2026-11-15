"use client";

import { useState } from "react";
import Image from "next/image";
import type { AreaMaps } from "@/types/area-data";

type FaisalabadMapsViewProps = {
  maps: AreaMaps | undefined;
  statusLabel: string;
};

function Legend({ stops, vmin, vmax, unit }: { stops: string[]; vmin: number; vmax: number; unit: string }) {
  return (
    <div className="compare-map-legend" aria-label={`Map legend from ${vmin} to ${vmax} ${unit}`}>
      <div className="compare-map-legend-bar" style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }} />
      <div className="compare-map-legend-labels" dir="ltr"><span>{vmin.toFixed(1)} {unit}</span><span>{vmax.toFixed(1)} {unit}</span></div>
    </div>
  );
}

export function FaisalabadMapsView({ maps, statusLabel }: FaisalabadMapsViewProps) {
  const [split, setSplit] = useState(50);
  const [missingImage, setMissingImage] = useState(false);
  if (!maps || missingImage) {
    return <p className="compare-state-card" role="status">Maps in progress</p>;
  }

  const start = maps.images.lst_2001;
  const end = maps.images.lst_2024;
  const change = maps.images.lst_change;
  const imagePath = (file: string) => `/data/areas/faisalabad/maps/${file}`;

  return (
    <section className="compare-maps-view" aria-label="Faisalabad land surface temperature maps">
      <div className="compare-map-heading">
        <div><h2>Land surface temperature</h2><p>2001 vs 2024</p></div>
        <span className="data-status-badge"><span className="data-status-dot" aria-hidden="true" />{statusLabel}</span>
      </div>
      <div className="compare-map-swipe">
        <Image className="compare-map-image compare-map-image-base" src={imagePath(end.file)} width={end.width} height={end.height} unoptimized alt="Faisalabad land surface temperature map for 2024" onError={() => setMissingImage(true)} />
        <div className="compare-map-image-clip" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
          <Image className="compare-map-image" src={imagePath(start.file)} width={start.width} height={start.height} unoptimized alt="Faisalabad land surface temperature map for 2001" onError={() => setMissingImage(true)} />
        </div>
        <span className="compare-map-label compare-map-label-start">2001</span>
        <span className="compare-map-label compare-map-label-end">2024</span>
      </div>
      <label className="compare-map-slider">
        <span>Swipe between years</span>
        <input type="range" min="0" max="100" value={split} onChange={(event) => setSplit(Number(event.currentTarget.value))} aria-label="Swipe between 2001 and 2024 maps" />
      </label>
      <p className="compare-map-caption">Same color scale in both maps · {start.source_file} · {statusLabel}</p>
      <Legend stops={start.legend_stops} vmin={start.vmin} vmax={start.vmax} unit={start.unit} />
      <figure className="compare-change-map">
        <figcaption><strong>Change map, 2001 to 2024</strong><span>{change.source_file} · {statusLabel}</span></figcaption>
        <Image src={imagePath(change.file)} width={change.width} height={change.height} unoptimized alt="Faisalabad land surface temperature change map from 2001 to 2024" onError={() => setMissingImage(true)} />
        <Legend stops={change.legend_stops} vmin={change.vmin} vmax={change.vmax} unit={change.unit} />
      </figure>
    </section>
  );
}
