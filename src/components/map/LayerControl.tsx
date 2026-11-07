"use client";

import { useQuery } from "@tanstack/react-query";
import { getVariables } from "@/lib/api";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { variableIdSchema } from "@/types/api";

const YEARS = Array.from({ length: 26 }, (_, index) => 2025 - index);

export function LayerControl() {
  const messages = useMessages();
  const variable = useUiStore((state) => state.variable);
  const yearRange = useUiStore((state) => state.yearRange);
  const layerType = useUiStore((state) => state.mapLayerType);
  const changeBasis = useUiStore((state) => state.changeBasis);
  const setVariable = useUiStore((state) => state.setVariable);
  const setYearRange = useUiStore((state) => state.setYearRange);
  const setMapLayerType = useUiStore((state) => state.setMapLayerType);
  const setChangeBasis = useUiStore((state) => state.setChangeBasis);
  const variablesQuery = useQuery({
    queryKey: ["variables"],
    queryFn: getVariables,
  });
  const selectedYear = yearRange[1];

  function updateYear(nextYear: number) {
    setYearRange([
      Math.min(yearRange[0], nextYear),
      nextYear,
    ]);
  }

  return (
    <div className="layer-control">
      {variablesQuery.isPending && (
        <div className="map-form-skeleton" aria-label={messages.mapLoadingData} />
      )}
      {variablesQuery.isError && (
        <p className="map-inline-error" role="alert">
          {messages.mapDataError}
        </p>
      )}
      {variablesQuery.data && (
        <>
          <label className="map-field">
            <span>{messages.mapVariable}</span>
            <select
              value={variable}
              onChange={(event) =>
                setVariable(variableIdSchema.parse(event.currentTarget.value))
              }
            >
              {variablesQuery.data.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="map-field">
            <span>{messages.mapYear}</span>
            <select
              value={selectedYear}
              onChange={(event) => updateYear(Number(event.currentTarget.value))}
            >
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="map-field">
            <span>{messages.mapLayerType}</span>
            <select
              value={layerType}
              onChange={(event) => {
                if (event.currentTarget.value === "absolute" || event.currentTarget.value === "change") {
                  setMapLayerType(event.currentTarget.value);
                }
              }}
            >
              <option value="absolute">{messages.mapAbsolute}</option>
              <option value="change">{messages.mapChange}</option>
            </select>
          </label>

          {layerType === "change" && (
            <label className="map-field">
              <span>{messages.mapComparison}</span>
              <select
                value={changeBasis}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  if (
                    value === "previous-year" ||
                    value === "range-start" ||
                    value === "backend"
                  ) {
                    setChangeBasis(value);
                  }
                }}
              >
                <option value="previous-year" disabled={selectedYear === 2000}>
                  {messages.mapPreviousYear}
                </option>
                <option value="range-start" disabled={yearRange[0] === selectedYear}>
                  {messages.mapRangeStart}
                </option>
                <option value="backend">{messages.mapBackendChange}</option>
              </select>
            </label>
          )}
        </>
      )}
    </div>
  );
}
