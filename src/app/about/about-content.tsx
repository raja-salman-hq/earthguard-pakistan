"use client";

import { useQuery } from "@tanstack/react-query";
import { useMessages } from "@/hooks/use-messages";
import { getVariables } from "@/lib/api";
import { isDemoMode } from "@/lib/api/client";
import { getVariableLabel } from "@/lib/i18n";
import { useUiStore } from "@/store/ui-store";
import type { VariableId } from "@/types/api";

const variableDescriptionKeys = {
  air_temperature: "aboutAirTemperatureDescription",
  precipitation: "aboutPrecipitationDescription",
  vegetation_index: "aboutVegetationIndexDescription",
  snow_cover: "aboutSnowCoverDescription",
  soil_moisture: "aboutSoilMoistureDescription",
  evapotranspiration: "aboutEvapotranspirationDescription",
  land_surface_temperature: "aboutLandSurfaceTemperatureDescription",
} as const satisfies Record<
  VariableId,
  | "aboutAirTemperatureDescription"
  | "aboutPrecipitationDescription"
  | "aboutVegetationIndexDescription"
  | "aboutSnowCoverDescription"
  | "aboutSoilMoistureDescription"
  | "aboutEvapotranspirationDescription"
  | "aboutLandSurfaceTemperatureDescription"
>;

export default function AboutContent() {
  const messages = useMessages();
  const language = useUiStore((state) => state.language);
  const variablesQuery = useQuery({
    queryKey: ["variables"],
    queryFn: getVariables,
  });

  return (
    <main className="about-page page-shell">
      <header className="about-heading">
        <span className="eyebrow">{messages.aboutEyebrow}</span>
        <h1>{messages.aboutTitle}</h1>
        <p>{messages.aboutDescription}</p>
      </header>

      <section className="about-card about-purpose" aria-labelledby="about-purpose-title">
        <div>
          <h2 id="about-purpose-title">{messages.aboutPurposeTitle}</h2>
          <p>{messages.aboutPurposeText}</p>
        </div>
        <div>
          <h3>{messages.aboutChallengeTitle}</h3>
          <p>{messages.aboutChallengeText}</p>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-measures-title">
        <div className="about-section-heading">
          <h2 id="about-measures-title">{messages.aboutMeasuresTitle}</h2>
          <p>{messages.aboutMeasuresText}</p>
        </div>
        {variablesQuery.isPending ? (
          <div className="about-variable-grid" role="status" aria-label={messages.aboutVariablesLoading}>
            {Array.from({ length: 4 }, (_, index) => (
              <div className="about-variable-card" key={index}>
                <div className="skeleton skeleton-heading" />
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line-short" />
              </div>
            ))}
          </div>
        ) : variablesQuery.isError ? (
          <div className="about-state-card" role="alert">
            <p>{messages.aboutVariablesError}</p>
            <button type="button" onClick={() => void variablesQuery.refetch()}>
              {messages.aboutRetry}
            </button>
          </div>
        ) : !variablesQuery.data?.length ? (
          <p className="about-state-card" role="status">{messages.aboutVariablesEmpty}</p>
        ) : (
          <ul className="about-variable-grid">
            {variablesQuery.data.map((variable) => (
              <li className="about-variable-card" key={variable.id}>
                <h3>{getVariableLabel(variable.id, language)}</h3>
                <p>{messages[variableDescriptionKeys[variable.id]]}</p>
                <div className="about-variable-meta">
                  <bdi dir="ltr">{variable.unit}</bdi>
                  <span>{messages.aboutAvailableYears}</span>
                  <bdi dir="ltr">{variable.availableFrom}–{variable.availableTo}</bdi>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="about-section" aria-labelledby="about-methods-title">
        <div className="about-section-heading">
          <h2 id="about-methods-title">{messages.aboutMethodsTitle}</h2>
        </div>
        <div className="about-method-grid">
          <article className="about-card">
            <h3>{messages.aboutTrendTitle}</h3>
            <p>{messages.aboutTrendText}</p>
          </article>
          <article className="about-card">
            <h3>{messages.aboutSenSlopeTitle}</h3>
            <p>{messages.aboutSenSlopeText}</p>
          </article>
          <article className="about-card">
            <h3>{messages.aboutMannKendallTitle}</h3>
            <p>{messages.aboutMannKendallText}</p>
          </article>
          <article className="about-card">
            <h3>{messages.aboutPValueTitle}</h3>
            <p>{messages.aboutPValueText}</p>
          </article>
          <article className="about-card">
            <h3>{messages.aboutSignificanceTitle}</h3>
            <p>{messages.aboutSignificanceText}</p>
          </article>
          <p className="about-backend-note">{messages.aboutBackendNote}</p>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-credits-title">
        <div className="about-section-heading">
          <h2 id="about-credits-title">{messages.aboutCreditsTitle}</h2>
        </div>
        <div className="about-credit-grid">
          <article className="about-card">
            <h3>geoBoundaries</h3>
            <p>
              {messages.aboutBoundaryCitationPrefix}
              <a href="https://www.geoboundaries.org" target="_blank" rel="noopener noreferrer">
                https://www.geoboundaries.org
              </a>
              {messages.aboutBoundaryCitationSuffix}
            </p>
            <p>{messages.aboutBoundaryLicense}</p>
            <p>{messages.aboutBoundaryMetadataCredit}</p>
            <cite>
              {messages.aboutAcademicCitation}{" "}
              <a
                href="https://doi.org/10.1371/journal.pone.0231866"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://doi.org/10.1371/journal.pone.0231866
              </a>
            </cite>
          </article>
          <article className="about-card">
            <h3>{messages.aboutDatasetSourcesTitle}</h3>
            {isDemoMode ? (
              <div className="about-demo-credit">
                <span className="demo-badge">{messages.demoBadge}</span>
                <p>{messages.aboutDemoCredits}</p>
                <strong>{messages.aboutBackendCredits}</strong>
              </div>
            ) : variablesQuery.isPending ? (
              <div role="status" aria-label={messages.aboutVariablesLoading}>
                <div className="skeleton skeleton-line" />
                <div className="skeleton skeleton-line-short" />
              </div>
            ) : variablesQuery.isError ? (
              <div className="about-source-error" role="alert">
                <p>{messages.aboutVariablesError}</p>
                <button type="button" onClick={() => void variablesQuery.refetch()}>
                  {messages.aboutRetry}
                </button>
              </div>
            ) : variablesQuery.data?.length ? (
              <ul className="about-source-list">
                {variablesQuery.data.map((variable) => (
                  <li key={variable.id}>
                    <strong>{getVariableLabel(variable.id, language)}</strong>
                    <span>{variable.source}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status">{messages.aboutVariablesEmpty}</p>
            )}
          </article>
        </div>
      </section>

      <section className="about-section" aria-labelledby="about-limitations-title">
        <div className="about-section-heading">
          <h2 id="about-limitations-title">{messages.aboutLimitationsTitle}</h2>
        </div>
        <ul className="about-limitations">
          <li>{messages.aboutResolutionLimit}</li>
          <li>{messages.aboutDisputedBoundaryLimit}</li>
          <li>{messages.aboutCausationLimit}</li>
          <li>{messages.aboutPeriodLimit}</li>
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-team-title">
        <div className="about-section-heading">
          <h2 id="about-team-title">{messages.aboutTeamTitle}</h2>
        </div>
        <div className="about-card about-team-card">
          <p>{messages.aboutTeamPlaceholder}</p>
          <p>{messages.aboutOpenSourcePlaceholder}</p>
        </div>
      </section>
    </main>
  );
}
