"use client";

import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";

export function LayerToggle() {
  const messages = useMessages();
  const layerType = useUiStore((state) => state.mapLayerType);
  const changeBasis = useUiStore((state) => state.changeBasis);
  const yearRange = useUiStore((state) => state.yearRange);
  const currentYear = useUiStore((state) => state.currentYear);
  const setCurrentYear = useUiStore((state) => state.setCurrentYear);
  const setMapLayerType = useUiStore((state) => state.setMapLayerType);
  const setChangeBasis = useUiStore((state) => state.setChangeBasis);

  return (
    <fieldset className="filter-field-group layer-toggle">
      <legend>{messages.mapLayerType}</legend>
      <label>
        <input
          type="radio"
          name="map-layer-type"
          value="absolute"
          checked={layerType === "absolute"}
          onChange={() => setMapLayerType("absolute")}
        />
        <span>{messages.filterAbsoluteValues}</span>
      </label>
      <label>
        <input
          type="radio"
          name="map-layer-type"
          value="change"
          checked={layerType === "change"}
          onChange={() => {
            setMapLayerType("change");
            if (changeBasis === "previous-year" && currentYear === 2000 && yearRange[1] > 2000) {
              setCurrentYear(Math.max(yearRange[0], 2001));
            }
          }}
        />
        <span>{messages.filterChangeOverTime}</span>
      </label>
      {layerType === "change" && (
        <label className="map-field layer-comparison">
          <span>{messages.mapComparison}</span>
          <select
            value={changeBasis}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === "previous-year" || value === "range-start" || value === "backend") {
                setChangeBasis(value);
              }
            }}
          >
            <option value="previous-year" disabled={currentYear === 2000}>
              {messages.mapPreviousYear}
            </option>
            <option value="range-start" disabled={yearRange[0] === yearRange[1]}>
              {messages.mapRangeStart}
            </option>
            <option value="backend">{messages.mapBackendChange}</option>
          </select>
        </label>
      )}
    </fieldset>
  );
}
