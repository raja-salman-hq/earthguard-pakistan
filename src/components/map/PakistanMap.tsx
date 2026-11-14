"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import MapView, {
  Layer,
  Marker,
  type MapLayerMouseEvent,
  type MapRef,
  Source,
} from "react-map-gl/maplibre";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { getAreaStudyArea, getAreas, getMapLayer } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import {
  mapLayerQuerySchema,
  regionIdSchema,
  type RegionsResponse,
  type Variable,
} from "@/types/api";
import { createMapLayerQuery } from "@/lib/map-layer-query";
import { MapLegend } from "./MapLegend";
import { getRegionLabel } from "@/lib/i18n";

const MAP_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const PAKISTAN_BOUNDS: [[number, number], [number, number]] = [
  [60.5, 23],
  [78.5, 37.5],
];
const MAX_PAN_BOUNDS: [number, number, number, number] = [56, 19, 82, 41];

type MapColors = {
  background: string;
  cool: string;
  noData: string;
  outline: string;
  selected: string;
  hovered: string;
  negative: string;
  neutral: string;
  positive: string;
  sequential: [string, string, string, string, string];
};

export type PakistanMapProps = {
  regions: RegionsResponse | undefined;
  boundaryLoading: boolean;
  boundaryError: string | undefined;
  variable: Variable | undefined;
};

type HoveredRegion = {
  id: string;
  name: string;
  value: number | null;
  x: number;
  y: number;
};

function geometryBounds(
  geometry: NonNullable<RegionsResponse["features"][number]["geometry"]>,
): [[number, number], [number, number]] | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  function visit(value: unknown): void {
    if (!Array.isArray(value)) {
      return;
    }

    if (typeof value[0] === "number" && typeof value[1] === "number") {
      west = Math.min(west, value[0]);
      south = Math.min(south, value[1]);
      east = Math.max(east, value[0]);
      north = Math.max(north, value[1]);
      return;
    }

    value.forEach(visit);
  }

  visit(geometry.coordinates);
  return Number.isFinite(west) && Number.isFinite(south) && Number.isFinite(east) && Number.isFinite(north)
    ? [[west, south], [east, north]]
    : null;
}

function readMapColors(): MapColors {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => styles.getPropertyValue(name).trim();

  return {
    background: token("--background"),
    cool: token("--cool"),
    noData: token("--map-no-data"),
    outline: token("--map-outline"),
    selected: token("--map-selected"),
    hovered: token("--map-hovered"),
    negative: token("--map-negative"),
    neutral: token("--map-neutral"),
    positive: token("--map-positive"),
    sequential: [
      token("--map-sequential-1"),
      token("--map-sequential-2"),
      token("--map-sequential-3"),
      token("--map-sequential-4"),
      token("--map-sequential-5"),
    ],
  };
}

function makeFallbackStyle(background: string): StyleSpecification {
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: "plain-background",
        type: "background",
        paint: { "background-color": background },
      },
    ],
  };
}

export const PakistanMap = memo(function PakistanMap({
  regions,
  boundaryLoading,
  boundaryError,
  variable,
}: PakistanMapProps) {
  const messages = useMessages();
  const mapRef = useRef<MapRef>(null);
  const previousHover = useRef<string | null>(null);
  const previousSelection = useRef<string | null>(null);
  const selectedProvince = useUiStore((state) => state.province);
  const selectedArea = useUiStore((state) => state.area);
  const language = useUiStore((state) => state.language);
  const setRegion = useUiStore((state) => state.setRegion);
  const setProvince = useUiStore((state) => state.setProvince);
  const setArea = useUiStore((state) => state.setArea);
  const selectedVariable = useUiStore((state) => state.variable);
  const selectedYear = useUiStore((state) => state.currentYear);
  const startYear = useUiStore((state) => state.yearRange[0]);
  const layerType = useUiStore((state) => state.mapLayerType);
  const changeBasis = useUiStore((state) => state.changeBasis);
  const [fallbackStyle, setFallbackStyle] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const fallbackUpdateQueued = useRef(false);
  const [hoveredRegion, setHoveredRegion] = useState<HoveredRegion | null>(null);
  const colors = useMemo(() => readMapColors(), []);
  const mapLib = useMemo(() => import("maplibre-gl"), []);
  const areasQuery = useQuery({
    queryKey: ["areas-config"],
    queryFn: getAreas,
    enabled: !isDemoMode,
    staleTime: Infinity,
  });
  const studyAreaQuery = useQuery({
    queryKey: ["study-area-geometry", selectedArea],
    queryFn: () => getAreaStudyArea("faisalabad"),
    enabled: !isDemoMode && selectedArea === "faisalabad",
    staleTime: Infinity,
  });

  const request = useMemo(
    () =>
      createMapLayerQuery(
        selectedVariable,
        selectedYear,
        layerType,
        changeBasis,
        startYear,
      ),
    [changeBasis, layerType, selectedVariable, selectedYear, startYear],
  );
  const debouncedRequest = useDebouncedValue(request, 220);
  const canLoadPreviousYear =
    debouncedRequest.comparison !== "previous-year" || debouncedRequest.year > 2000;
  const layerQuery = useQuery({
    queryKey: ["map-layer", debouncedRequest],
    queryFn: () => getMapLayer(debouncedRequest),
    enabled: isDemoMode && canLoadPreviousYear,
    placeholderData: (previousData, previousQuery) => {
      const previousRequest = mapLayerQuerySchema.safeParse(previousQuery?.queryKey[1]);
      const sameLayer =
        previousRequest.success &&
        previousRequest.data.variable === debouncedRequest.variable &&
        previousRequest.data.comparison === debouncedRequest.comparison &&
        previousRequest.data.baselineYear === debouncedRequest.baselineYear;
      return sameLayer ? previousData : undefined;
    },
  });

  const valueByRegion = useMemo(
    () => new Map(layerQuery.data?.map(({ regionId, value }) => [regionId, value])),
    [layerQuery.data],
  );
  const values = useMemo(
    () => Array.from(valueByRegion.values()),
    [valueByRegion],
  );
  const mapData = useMemo(() => {
    if (!regions) {
      return undefined;
    }

    return {
      type: "FeatureCollection" as const,
      features: regions.features.flatMap((feature) => {
        if (!feature.geometry) {
          return [];
        }

        return [
          {
            type: "Feature" as const,
            id: feature.id,
            geometry: feature.geometry,
            properties: {
              ...feature.properties,
              regionId: feature.id,
              value: valueByRegion.get(feature.id) ?? null,
            },
          },
        ];
      }),
    };
  }, [regions, valueByRegion]);

  const domain = useMemo(() => {
    if (values.length === 0) {
      return { minimum: 0, maximum: 1 };
    }

    const minimum = Math.min(...values);
    const maximum = Math.max(...values);

    if (layerType === "change") {
      const extent = Math.max(Math.abs(minimum), Math.abs(maximum), 0.001);
      return { minimum: -extent, maximum: extent };
    }

    return {
      minimum,
      maximum: maximum > minimum ? maximum : minimum + 1,
    };
  }, [layerType, values]);

  const fillColor = useMemo((): ExpressionSpecification => {
    if (layerType === "change") {
      return [
        "interpolate",
        ["linear"],
        ["get", "value"],
        domain.minimum,
        colors.negative,
        0,
        colors.neutral,
        domain.maximum,
        colors.positive,
      ];
    }

    const stops = colors.sequential;
    const step = (domain.maximum - domain.minimum) / (stops.length - 1);
    return [
      "interpolate",
      ["linear"],
      ["get", "value"],
      domain.minimum,
      stops[0],
      domain.minimum + step,
      stops[1],
      domain.minimum + step * 2,
      stops[2],
      domain.minimum + step * 3,
      stops[3],
      domain.maximum,
      stops[4],
    ];
  }, [colors, domain, layerType]);

  const fillLayer = useMemo(
    () => ({
      id: "province-fill",
      type: "fill" as const,
      paint: {
        "fill-color": [
          "case",
          ["==", ["get", "value"], null],
          colors.noData,
          fillColor,
        ] as ExpressionSpecification,
        "fill-opacity": (isDemoMode
          ? ["case", ["boolean", ["feature-state", "hover"], false], 0.88, 0.7]
          : [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.65,
              selectedProvince === "pakistan"
                ? 0.42
                : ["case", ["==", ["get", "regionId"], selectedProvince], 0.6, 0.12],
            ]) as ExpressionSpecification,
      },
    }),
    [colors.noData, fillColor, selectedProvince],
  );
  const outlineLayer = useMemo(
    () => ({
      id: "province-outline",
      type: "line" as const,
      paint: {
        "line-color": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          colors.selected,
          ["boolean", ["feature-state", "hover"], false],
          colors.hovered,
          colors.outline,
        ] as ExpressionSpecification,
        "line-width": [
          "case",
          ["boolean", ["feature-state", "selected"], false],
          3,
          ["boolean", ["feature-state", "hover"], false],
          2,
          0.8,
        ] as ExpressionSpecification,
      },
    }),
    [colors.hovered, colors.outline, colors.selected],
  );
  const plainStyle = useMemo(
    () => makeFallbackStyle(colors.background),
    [colors.background],
  );

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !map.getSource("pakistan-provinces")) {
      return;
    }

    if (previousSelection.current) {
      map.setFeatureState(
        { source: "pakistan-provinces", id: previousSelection.current },
        { selected: false },
      );
    }
    if (selectedProvince !== "pakistan") {
      map.setFeatureState(
        { source: "pakistan-provinces", id: selectedProvince },
        { selected: true },
      );
      previousSelection.current = selectedProvince;
    } else {
      previousSelection.current = null;
    }
  }, [selectedProvince, mapData, fallbackStyle]);

  const resetView = useCallback(() => {
    mapRef.current?.fitBounds(PAKISTAN_BOUNDS, {
      padding: 48,
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
      maxZoom: 6,
    });
  }, []);

  useEffect(() => {
    if (!mapLoaded) {
      return;
    }

    if (selectedArea && areasQuery.data) {
      const selected = areasQuery.data.areas.find((area) => area.id === selectedArea);
      if (selected) {
        mapRef.current?.fitBounds(
          [
            [selected.bounds[0], selected.bounds[1]],
            [selected.bounds[2], selected.bounds[3]],
          ],
          {
            padding: 48,
            duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 700,
            maxZoom: 9,
          },
        );
      }
      return;
    }

    if (selectedProvince === "pakistan") {
      resetView();
      return;
    }

    const provinceFeature = regions?.features.find((feature) => feature.id === selectedProvince);
    const bounds = provinceFeature?.geometry ? geometryBounds(provinceFeature.geometry) : null;
    if (bounds) {
      mapRef.current?.fitBounds(bounds, {
        padding: 48,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
        maxZoom: 7,
      });
    }
  }, [areasQuery.data, mapLoaded, regions, resetView, selectedArea, selectedProvince]);

  const clearHover = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (map && previousHover.current) {
      map.setFeatureState(
        { source: "pakistan-provinces", id: previousHover.current },
        { hover: false },
      );
    }
    previousHover.current = null;
    setHoveredRegion(null);
  }, []);

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const region = regionIdSchema.safeParse(feature?.properties?.regionId);
      if (!feature || !region.success) {
        clearHover();
        return;
      }

      const map = mapRef.current?.getMap();
      if (previousHover.current && previousHover.current !== region.data && map) {
        map.setFeatureState(
          { source: "pakistan-provinces", id: previousHover.current },
          { hover: false },
        );
      }
      if (previousHover.current !== region.data && map) {
        map.setFeatureState(
          { source: "pakistan-provinces", id: region.data },
          { hover: true },
        );
      }

      previousHover.current = region.data;
      setHoveredRegion({
        id: region.data,
        name: String(feature.properties?.name ?? region.data),
        value:
          typeof feature.properties?.value === "number"
            ? feature.properties.value
            : null,
        x: event.point.x,
        y: event.point.y,
      });
    },
    [clearHover],
  );

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const result = regionIdSchema.safeParse(
        event.features?.[0]?.properties?.regionId,
      );
      if (result.success) {
        if (isDemoMode) {
          setRegion(result.data);
        } else {
          setProvince(result.data);
        }
      }
    },
    [setProvince, setRegion],
  );

  const handleMapError = useCallback(() => {
    if (fallbackUpdateQueued.current) {
      return;
    }

    fallbackUpdateQueued.current = true;
    queueMicrotask(() => setFallbackStyle(true));
  }, []);
  const mapStyle = fallbackStyle ? plainStyle : MAP_STYLE_URL;

  return (
    <div className="map-canvas" dir="ltr">
      <MapView
        ref={mapRef}
        mapLib={mapLib}
        workerUrl="/maplibre-gl-worker.mjs"
        mapStyle={mapStyle}
        initialViewState={{ longitude: 69.5, latitude: 30.5, zoom: 4.1 }}
        minZoom={3.5}
        maxZoom={8}
        maxBounds={MAX_PAN_BOUNDS}
        interactiveLayerIds={mapData ? ["province-fill"] : []}
        onLoad={() => setMapLoaded(true)}
        onError={handleMapError}
        onMouseMove={handleMouseMove}
        onMouseLeave={clearHover}
        onClick={handleClick}
        aria-label={messages.mapAccessibleLabel}
      >
        {mapData && (
          <Source id="pakistan-provinces" type="geojson" data={mapData}>
            <Layer {...fillLayer} />
            <Layer {...outlineLayer} />
          </Source>
        )}
        {!isDemoMode && studyAreaQuery.data && (
          <Source id="faisalabad-study-area" type="geojson" data={studyAreaQuery.data}>
            <Layer
              id="study-area-glow"
              type="line"
              paint={{
                "line-color": colors.selected,
                "line-width": 10,
                "line-blur": 8,
                "line-opacity": 0.55,
              }}
            />
            <Layer
              id="study-buffer-fill"
              type="fill"
              filter={["==", ["get", "kind"], "buffer"]}
              paint={{ "fill-color": colors.cool, "fill-opacity": 0.1 }}
            />
            <Layer
              id="study-district-fill"
              type="fill"
              filter={["==", ["get", "kind"], "district"]}
              paint={{ "fill-color": colors.selected, "fill-opacity": 0.24 }}
            />
            <Layer
              id="study-buffer-outline"
              type="line"
              filter={["==", ["get", "kind"], "buffer"]}
              paint={{
                "line-color": colors.cool,
                "line-width": 2,
                "line-opacity": 0.95,
              }}
            />
            <Layer
              id="study-district-outline"
              type="line"
              filter={["==", ["get", "kind"], "district"]}
              paint={{
                "line-color": colors.selected,
                "line-width": 3,
                "line-opacity": 1,
              }}
            />
          </Source>
        )}
        {!isDemoMode &&
          selectedProvince === "punjab" &&
          !selectedArea &&
          areasQuery.data?.areas
            .filter((area) => area.id === "faisalabad")
            .map((area) => (
              <Marker
                key={area.id}
                longitude={area.center[0]}
                latitude={area.center[1]}
                anchor="bottom"
              >
                <button
                  className="map-available-marker"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setArea(area.id);
                  }}
                >
                  <MapPin aria-hidden="true" size={16} />
                  {messages.mapAvailableMarker}
                </button>
              </Marker>
            ))}
      </MapView>

      {!isDemoMode && (
        <>
          <nav className="map-breadcrumb" aria-label={messages.mapBreadcrumb}>
            <button type="button" onClick={() => setProvince("pakistan")}>
              {messages.mapPakistan}
            </button>
            {selectedProvince !== "pakistan" && (
              <>
                <span aria-hidden="true">›</span>
                <button type="button" onClick={() => setArea(null)}>
                  {getRegionLabel(selectedProvince, language)}
                </button>
              </>
            )}
            {selectedArea && (
              <>
                <span aria-hidden="true">›</span>
                <span>{messages.areaFaisalabad}</span>
              </>
            )}
          </nav>
          {selectedProvince !== "pakistan" && !selectedArea && (
            <section className="map-province-panel" aria-labelledby="map-province-panel-title">
              <h2 id="map-province-panel-title">
                {messages.mapProvinceAreas.replace(
                  "{province}",
                  getRegionLabel(selectedProvince, language),
                )}
              </h2>
              {selectedProvince === "punjab" ? (
                areasQuery.isError ? (
                  <p role="alert">{areasQuery.error.message}</p>
                ) : areasQuery.isPending ? (
                  <p role="status">{messages.mapLoading}</p>
                ) : (
                  <ul>
                    {areasQuery.data?.areas.map((area) => (
                      <li key={area.id}>
                        <button
                          type="button"
                          disabled={area.status !== "available"}
                          onClick={() => setArea(area.id)}
                        >
                          <span>{area.name}</span>
                          <span className={`map-area-status is-${area.status}`}>
                            {area.status === "available"
                              ? messages.mapAvailableStatus
                              : messages.mapComingSoonStatus}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                <p>{messages.mapNoDataYet}</p>
              )}
            </section>
          )}
          {selectedArea && studyAreaQuery.isError && (
            <p className="map-study-area-error" role="alert">{studyAreaQuery.error.message}</p>
          )}
        </>
      )}

      <div className="map-navigation-controls" aria-label={messages.mapControls}>
        <button
          type="button"
          onClick={() => mapRef.current?.getMap().zoomIn()}
          aria-label={messages.mapZoomIn}
          title={messages.mapZoomIn}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.getMap().zoomOut()}
          aria-label={messages.mapZoomOut}
          title={messages.mapZoomOut}
        >
          -
        </button>
        <button
          type="button"
          onClick={resetView}
          aria-label={messages.mapResetView}
          title={messages.mapResetView}
        >
          ↺
        </button>
      </div>

      {fallbackStyle && (
        <p className="map-style-fallback" role="status">
          {messages.mapStyleFallback}
        </p>
      )}

      {hoveredRegion && (
        <div
          className="map-tooltip"
          style={{ left: hoveredRegion.x + 14, top: hoveredRegion.y + 14 }}
          role="status"
        >
          <strong>{hoveredRegion.name}</strong>
          <span>
            {hoveredRegion.value === null
              ? messages.mapNoData
              : (
                <>
                  <bdi dir="ltr">{new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(hoveredRegion.value)}</bdi>{" "}
                  <bdi dir="ltr">{variable?.unit ?? ""}</bdi>
                </>
              )}
          </span>
        </div>
      )}

      {boundaryLoading && (
        <div className="map-state-overlay" role="status">
          <div className="map-state-card">
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-line" />
            <span>{messages.mapLoading}</span>
          </div>
        </div>
      )}
      {boundaryError && !boundaryLoading && (
        <div className="map-state-overlay" role="alert">
          <div className="map-state-card">
            <strong>{messages.mapBoundaryError}</strong>
            <p>{boundaryError}</p>
            <p>{messages.mapBoundaryFileHint}</p>
          </div>
        </div>
      )}
      {isDemoMode && !boundaryError && !boundaryLoading && canLoadPreviousYear && layerQuery.isPending && (
        <div className="map-state-overlay map-state-overlay-light" role="status">
          <div className="map-state-card">
            <div className="skeleton skeleton-heading" />
            <span>{messages.mapLoadingData}</span>
          </div>
        </div>
      )}
      {isDemoMode && !boundaryError && !boundaryLoading && !canLoadPreviousYear && (
        <div className="map-state-overlay map-state-overlay-light" role="status">
          <div className="map-state-card">{messages.mapPreviousYearUnavailable}</div>
        </div>
      )}
      {isDemoMode && !boundaryError && !boundaryLoading && layerQuery.isError && (
        <div className="map-state-overlay map-state-overlay-light" role="alert">
          <div className="map-state-card">
            <strong>{messages.mapDataError}</strong>
            <p>{layerQuery.error.message}</p>
          </div>
        </div>
      )}
      {isDemoMode &&
        !boundaryError &&
        !boundaryLoading &&
        layerQuery.isSuccess &&
        (!layerQuery.data || layerQuery.data.length === 0) && (
          <div className="map-state-overlay map-state-overlay-light" role="status">
            <div className="map-state-card">{messages.mapNoData}</div>
          </div>
        )}

      <MapLegend
        variable={variable}
        values={layerQuery.data?.map((entry) => entry.value)}
        layerType={layerType}
      />
      {isDemoMode && (
        <span className="map-demo-notice">{messages.mapDemoNotice}</span>
      )}
      {regions && (
        <a
          className="map-boundary-attribution"
          href="https://www.geoboundaries.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          {messages.mapBoundaryAttribution}
        </a>
      )}
    </div>
  );
});
