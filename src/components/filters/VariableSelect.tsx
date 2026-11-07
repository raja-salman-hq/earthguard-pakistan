"use client";

import { useQuery } from "@tanstack/react-query";
import { useMessages } from "@/hooks/use-messages";
import { useUiStore } from "@/store/ui-store";
import { getVariables } from "@/lib/api";
import { variableIdSchema } from "@/types/api";

export function VariableSelect() {
  const messages = useMessages();
  const selectedVariable = useUiStore((state) => state.variable);
  const yearRange = useUiStore((state) => state.yearRange);
  const currentYear = useUiStore((state) => state.currentYear);
  const setVariable = useUiStore((state) => state.setVariable);
  const setYearRange = useUiStore((state) => state.setYearRange);
  const setCurrentYear = useUiStore((state) => state.setCurrentYear);
  const variablesQuery = useQuery({ queryKey: ["variables"], queryFn: getVariables });

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
              {item.name} ({item.unit})
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
