"use client";

import type { Variable } from "@/types/api";
import type { MapLayerType } from "@/store/ui-store";
import { useMessages } from "@/hooks/use-messages";

type MapLegendProps = {
  variable: Variable | undefined;
  values: number[] | undefined;
  layerType: MapLayerType;
};

function formatValue(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(value);
}

export function MapLegend({ variable, values, layerType }: MapLegendProps) {
  const messages = useMessages();

  if (!variable || !values || values.length === 0) {
    return null;
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = layerType === "change"
    ? Math.max(Math.abs(minimum), Math.abs(maximum))
    : maximum;
  const lowerBound = layerType === "change" ? -range : minimum;
  const upperBound = layerType === "change" ? range : maximum;

  return (
    <aside className="map-legend glass-panel" aria-label={messages.mapLegend}>
      <div className="map-legend-heading">
        <strong>{variable.name}</strong>
        <bdi dir="ltr">{variable.unit}</bdi>
      </div>
      <div
        className={`map-legend-gradient map-legend-gradient-${layerType}`}
        role="img"
        aria-label={`${messages.mapLegend}: ${formatValue(lowerBound)} to ${formatValue(upperBound)} ${variable.unit}`}
      />
      <div className="map-legend-range">
        <bdi dir="ltr">{formatValue(lowerBound)}</bdi>
        <bdi dir="ltr">{formatValue(upperBound)}</bdi>
      </div>
    </aside>
  );
}
