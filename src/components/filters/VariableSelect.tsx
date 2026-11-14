"use client";

import { useQuery } from "@tanstack/react-query";
import { CloudRain, Leaf, Thermometer } from "lucide-react";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { getVariableLabel } from "@/lib/i18n";
import { getAreaIndicators, getVariables } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { variableIdSchema } from "@/types/api";

export function VariableSelect() {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const selectedVariable = useUiStore((state) => state.variable);
  const yearRange = useUiStore((state) => state.yearRange);
  const currentYear = useUiStore((state) => state.currentYear);
  const setVariable = useUiStore((state) => state.setVariable);
  const setYearRange = useUiStore((state) => state.setYearRange);
  const setCurrentYear = useUiStore((state) => state.setCurrentYear);
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: getVariables });
  const areaQuery = useQuery({
    queryKey: ["area-indicators", "faisalabad"],
    queryFn: () => getAreaIndicators("faisalabad"),
    enabled: !isDemoMode,
    staleTime: Infinity,
  });

  if (variablesQuery.isPending) {
    return <div className="map-form-skeleton" role="status" aria-label={messages.filterLoadingVariables} />;
  }

  if (variablesQuery.isError) {
    return <p className="map-inline-error" role="alert">{messages.filterVariablesError}</p>;
  }

  const variables = variablesQuery.data;
  if (!variables || variables.length === 0) {
    return <p className="map-empty-state" role="status">{messages.filterVariablesEmpty}</p>;
  }

  const selected = variables.find((item) => item.id === selectedVariable);

  function handleVariableChange(value: string) {
    const parsedId = variableIdSchema.safeParse(value);
    if (!parsedId.success) {
      return;
    }

    const nextVariable = variables.find((item) => item.id === parsedId.data);
    if (!nextVariable) {
      return;
    }

    const start = Math.min(nextVariable.availableTo, Math.max(nextVariable.availableFrom, yearRange[0]));
    const end = Math.min(nextVariable.availableTo, Math.max(start, yearRange[1]));
    setVariable(nextVariable.id);
    setYearRange([start, end]);
    setCurrentYear(Math.min(end, Math.max(start, currentYear)));
  }

  return (
    <div className="filter-field-group">
      {!isDemoMode && (
        <div className="indicator-cards" aria-label={messages.indicatorSelector}>
          {areaQuery.isPending ? (
            <div className="indicator-cards-loading" role="status">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-line" />
            </div>
          ) : areaQuery.isError ? (
            <p className="map-inline-error" role="alert">{messages.filterVariablesError}</p>
          ) : (
            areaQuery.data?.indicators.map((indicator) => {
              const latest = [...indicator.series].reverse().find((point) => point.value !== null);
              const Icon =
                indicator.id === "land_surface_temperature"
                  ? Thermometer
                  : indicator.id === "precipitation"
                    ? CloudRain
                    : Leaf;
              return (
                <button
                  className={`indicator-card${indicator.id === selectedVariable ? " is-selected" : ""}`}
                  type="button"
                  key={indicator.id}
                  aria-pressed={indicator.id === selectedVariable}
                  onClick={() => handleVariableChange(indicator.id)}
                >
                  <span className="indicator-card-icon"><Icon aria-hidden="true" size={18} /></span>
                  <span className="indicator-card-copy">
                    <strong>{getVariableLabel(indicator.id, language)}</strong>
                    <span><bdi dir="ltr">{indicator.unit}</bdi></span>
                    <span className="indicator-card-latest">
                      {latest?.value === null || latest?.value === undefined ? "—" : (
                        <><bdi dir="ltr">{latest.value}</bdi> · <bdi dir="ltr">{latest.year}</bdi></>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
      <label className="map-field" htmlFor="variable-select">
        <span>{messages.mapVariable}</span>
        <select
          id="variable-select"
          value={selectedVariable}
          dir="ltr"
          onChange={(event) => handleVariableChange(event.currentTarget.value)}
        >
          {variables.map((item) => (
            <option key={item.id} value={item.id}>
              {getVariableLabel(item.id, language)} ({item.unit})
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <div className="variable-description">
          <p>{selected.description}</p>
          <details className="variable-info">
            <summary aria-label={messages.filterVariableInfo}>{messages.filterVariableInfo}</summary>
            <div className="variable-info-content">
              <span>{selected.source}</span>
              <span>
                {selected.name}: <bdi dir="ltr">{selected.unit}</bdi>
              </span>
              <span>
                {messages.filterAvailableYears}:{" "}
                <bdi dir="ltr">{selected.availableFrom}–{selected.availableTo}</bdi>
              </span>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
