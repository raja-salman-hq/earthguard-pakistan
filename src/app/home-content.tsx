import type { ReactNode } from "react";
import "./home-content.css";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CheckCircle2,
  CircleDashed,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Ruler,
  Snowflake,
  Sprout,
  Thermometer,
  ThermometerSun,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getRegionLabel, getVariableLabel, messages } from "@/lib/i18n";
import type { Language, MessageKey } from "@/lib/i18n";
import type { RegionId, VariableId } from "@/types/api";

type DemoDirection = "increasing" | "decreasing" | "no_change";

type LandingVariable = {
  id: VariableId;
  unit: string;
};

type LandingInsight = {
  variable: VariableId;
  region: RegionId;
  unit: string;
  start: number;
  end: number;
  direction: DemoDirection;
  significant: boolean;
  changeTotal: number;
  changePercent: number;
};

type HeroProvinceShape = {
  regionId: RegionId;
  path: string;
  colorStep: number;
};

type LandingHeroMap = {
  viewBox: string;
  shapes: HeroProvinceShape[];
  value: number;
  unit: string;
  variable: VariableId;
  region: RegionId;
  year: number;
};

type HomeContentProps = {
  variables: LandingVariable[];
  heroMap: LandingHeroMap;
  heroSparklineValues: number[];
  heroTrend: Pick<LandingInsight, "direction" | "significant">;
  insights: LandingInsight[];
};

const variableIcons: Record<VariableId, LucideIcon> = {
  air_temperature: Thermometer,
  precipitation: CloudRain,
  vegetation_index: Sprout,
  snow_cover: Snowflake,
  soil_moisture: Droplets,
  evapotranspiration: CloudSun,
  land_surface_temperature: ThermometerSun,
};

const variableDescriptionKeys: Record<VariableId, MessageKey> = {
  air_temperature: "aboutAirTemperatureDescription",
  precipitation: "aboutPrecipitationDescription",
  vegetation_index: "aboutVegetationIndexDescription",
  snow_cover: "aboutSnowCoverDescription",
  soil_moisture: "aboutSoilMoistureDescription",
  evapotranspiration: "aboutEvapotranspirationDescription",
  land_surface_temperature: "aboutLandSurfaceTemperatureDescription",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);
}

function getSparklinePoints(values: number[]): string {
  if (values.length < 2) {
    return "0,22 168,22";
  }

  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const height = 38;
  const width = 168;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function LocalizedText({
  english,
  urdu,
  englishId,
  urduId,
}: {
  english: ReactNode;
  urdu: ReactNode;
  englishId?: string;
  urduId?: string;
}) {
  return (
    <>
      <span id={englishId} className="language-copy language-copy-en" lang="en" dir="ltr">
        {english}
      </span>
      <span id={urduId} className="language-copy language-copy-ur" lang="ur" dir="rtl">
        {urdu}
      </span>
    </>
  );
}

function getTrendSentence(
  insight: LandingInsight,
  language: Language,
): string {
  const localizedMessages = messages[language];
  const template =
    insight.direction === "increasing"
      ? localizedMessages.trendSentenceIncreasing
      : insight.direction === "decreasing"
        ? localizedMessages.trendSentenceDecreasing
        : localizedMessages.trendSentenceNoChange;
  const direction =
    insight.direction === "increasing"
      ? localizedMessages.trendIncreasing
      : insight.direction === "decreasing"
        ? localizedMessages.trendDecreasing
        : localizedMessages.trendNoChange;

  return template
    .replace("{start}", String(insight.start))
    .replace("{end}", String(insight.end))
    .replace("{variable}", getVariableLabel(insight.variable, language))
    .replace("{region}", getRegionLabel(insight.region, language))
    .replace("{direction}", direction)
    .replace("{change}", formatNumber(insight.changeTotal))
    .replace("{unit}", insight.unit)
    .replace("{percent}", formatNumber(insight.changePercent));
}

function TrendDirectionIcon({ direction }: { direction: DemoDirection }) {
  if (direction === "decreasing") {
    return <ArrowDownRight aria-hidden="true" />;
  }
  if (direction === "no_change") {
    return <ArrowRight aria-hidden="true" />;
  }
  return <ArrowUpRight aria-hidden="true" />;
}

function getTrendDirectionLabel(direction: DemoDirection, language: Language): string {
  const localizedMessages = messages[language];
  if (direction === "increasing") {
    return localizedMessages.trendIncreasing;
  }
  if (direction === "decreasing") {
    return localizedMessages.trendDecreasing;
  }
  return localizedMessages.trendNoChange;
}

export default function HomeContent({
  variables,
  heroMap,
  heroSparklineValues,
  heroTrend,
  insights,
}: HomeContentProps) {
  const sparklinePoints = getSparklinePoints(heroSparklineValues);
  const questions = [
    {
      title: "homeQuestionChangingTitle",
      description: "homeQuestionChangingText",
      href: "/explore?variable=air_temperature",
      Icon: Activity,
    },
    {
      title: "homeQuestionWhereTitle",
      description: "homeQuestionWhereText",
      href: "/explore?variable=air_temperature&region=punjab",
      Icon: MapPin,
    },
    {
      title: "homeQuestionHowMuchTitle",
      description: "homeQuestionHowMuchText",
      href: "/explore?variable=air_temperature&region=punjab",
      Icon: Ruler,
    },
    {
      title: "homeQuestionSignificanceTitle",
      description: "homeQuestionSignificanceText",
      href: "/about#about-methods-title",
      Icon: BadgeCheck,
    },
  ] satisfies Array<{ title: MessageKey; description: MessageKey; href: string; Icon: LucideIcon }>;
  return (
    <main className="home-page">
      <section className="home-hero page-shell">
        <div className="home-hero-copy">
          <span className="eyebrow">
            <LocalizedText english={messages.en.homeHeroEyebrow} urdu={messages.ur.homeHeroEyebrow} />
          </span>
          <h1>
            <LocalizedText english={messages.en.homeHeroTitle} urdu={messages.ur.homeHeroTitle} />
          </h1>
          <p>
            <LocalizedText english={messages.en.homeHeroSubtitle} urdu={messages.ur.homeHeroSubtitle} />
          </p>
          <a className="primary-button home-primary-button" href="/explore">
            <LocalizedText english={messages.en.homePrimaryCta} urdu={messages.ur.homePrimaryCta} />
            <ArrowRight aria-hidden="true" className="home-link-arrow" />
          </a>
        </div>

        <div className="home-hero-visual">
          <figure className="home-map-stage">
            <span id="home-map-accessible-title" className="sr-only">
              <LocalizedText english={messages.en.homeMapTitle} urdu={messages.ur.homeMapTitle} />
            </span>
            <span id="home-map-accessible-description" className="sr-only">
              <LocalizedText english={messages.en.homeMapDescription} urdu={messages.ur.homeMapDescription} />
            </span>
            <svg
              className="home-pakistan-map"
              viewBox={heroMap.viewBox}
              role="img"
              aria-labelledby="home-map-accessible-title"
              aria-describedby="home-map-accessible-description"
            >
              <title id="home-map-title">{messages.en.homeMapTitle}</title>
              <desc id="home-map-description">{messages.en.homeMapDescription}</desc>
              <defs>
                <radialGradient id="home-map-glow">
                  <stop offset="0" stopColor="var(--primary)" stopOpacity=".15" />
                  <stop offset="1" stopColor="var(--primary)" stopOpacity="0" />
                </radialGradient>
              </defs>
              <ellipse cx="260" cy="214" rx="226" ry="194" fill="url(#home-map-glow)" />
              <g className="home-province-shapes">
                {heroMap.shapes.map((shape) => (
                  <path
                    key={shape.regionId}
                    className="home-province-shape"
                    d={shape.path}
                    data-color-step={shape.colorStep}
                  >
                    <title>{getRegionLabel(shape.regionId, "en")}</title>
                  </path>
                ))}
              </g>
            </svg>
            <figcaption className="home-map-caption">
              <span>
                <LocalizedText english={messages.en.homeMapCaption} urdu={messages.ur.homeMapCaption} />
              </span>
              <span className="demo-badge">
                <LocalizedText english={messages.en.homeDemoBadge} urdu={messages.ur.homeDemoBadge} />
              </span>
            </figcaption>
            <div className="home-map-legend" aria-hidden="true">
              <span className="home-map-legend-bar" aria-hidden="true" />
              <span>
                <LocalizedText english={messages.en.homeMapLegend} urdu={messages.ur.homeMapLegend} />
              </span>
            </div>
          </figure>

          <article className="home-floating-card home-floating-trend">
            <span className="demo-badge">
              <LocalizedText english={messages.en.homeDemoBadge} urdu={messages.ur.homeDemoBadge} />
            </span>
            <span className="home-floating-title">
              <LocalizedText
                english={getVariableLabel("air_temperature", "en")}
                urdu={getVariableLabel("air_temperature", "ur")}
              />
            </span>
            <span className="home-sparkline-label">
              <LocalizedText
                english={messages.en.homeIllustrativeTrend}
                urdu={messages.ur.homeIllustrativeTrend}
              />
            </span>
            <span className="sr-only">
              <LocalizedText
                english={messages.en.homeSparklineDescription}
                urdu={messages.ur.homeSparklineDescription}
                englishId="home-sparkline-label-en"
                urduId="home-sparkline-label-ur"
              />
            </span>
            <svg
              className="home-sparkline"
              viewBox="0 0 168 38"
              role="img"
              aria-labelledby="home-sparkline-label-en home-sparkline-label-ur"
            >
              <title>{messages.en.homeSparklineDescription}</title>
              <polyline points={sparklinePoints} />
            </svg>
            <span className="home-trend-status">
              <span className="home-trend-direction">
                <TrendDirectionIcon direction={heroTrend.direction} />
                <LocalizedText
                  english={getTrendDirectionLabel(heroTrend.direction, "en")}
                  urdu={getTrendDirectionLabel(heroTrend.direction, "ur")}
                />
              </span>
              <span className={`home-significance${heroTrend.significant ? " is-significant" : ""}`}>
                {heroTrend.significant ? (
                  <CheckCircle2 aria-hidden="true" />
                ) : (
                  <CircleDashed aria-hidden="true" />
                )}
                <LocalizedText
                  english={heroTrend.significant ? messages.en.trendSignificant : messages.en.trendNotSignificant}
                  urdu={heroTrend.significant ? messages.ur.trendSignificant : messages.ur.trendNotSignificant}
                />
              </span>
            </span>
          </article>

          <article className="home-floating-card home-floating-value">
            <span className="demo-badge">
              <LocalizedText english={messages.en.homeDemoBadge} urdu={messages.ur.homeDemoBadge} />
            </span>
            <span className="home-example-value-label">
              <LocalizedText english={messages.en.homeExampleValue} urdu={messages.ur.homeExampleValue} />
            </span>
            <strong>
              <bdi dir="ltr">{formatNumber(heroMap.value)}</bdi>{" "}
              <bdi dir="ltr">{heroMap.unit}</bdi>
            </strong>
            <span className="home-example-value-context">
              <LocalizedText
                english={messages.en.homeRegionAndYear
                  .replace("{region}", getRegionLabel(heroMap.region, "en"))
                  .replace("{year}", String(heroMap.year))}
                urdu={messages.ur.homeRegionAndYear
                  .replace("{region}", getRegionLabel(heroMap.region, "ur"))
                  .replace("{year}", String(heroMap.year))}
              />
            </span>
          </article>
        </div>
      </section>

      <section className="home-section page-shell" aria-labelledby="home-questions-title">
        <div className="home-section-heading">
          <span className="eyebrow">
            <LocalizedText english={messages.en.homeQuestionsEyebrow} urdu={messages.ur.homeQuestionsEyebrow} />
          </span>
          <h2 id="home-questions-title">
            <LocalizedText english={messages.en.homeQuestionsTitle} urdu={messages.ur.homeQuestionsTitle} />
          </h2>
          <p>
            <LocalizedText english={messages.en.homeQuestionsSubtitle} urdu={messages.ur.homeQuestionsSubtitle} />
          </p>
        </div>
        <div className="home-question-grid">
          {questions.map(({ title, description, href, Icon }) => (
            <a className="home-question-card" href={href} key={title}>
              <Icon className="home-question-icon" aria-hidden="true" />
              <h3>
                <LocalizedText english={messages.en[title]} urdu={messages.ur[title]} />
              </h3>
              <p>
                <LocalizedText english={messages.en[description]} urdu={messages.ur[description]} />
              </p>
              <span className="home-card-link">
                <LocalizedText english={messages.en.homeQuestionLink} urdu={messages.ur.homeQuestionLink} />
                <ArrowRight className="home-link-arrow" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="home-section page-shell" aria-labelledby="home-variables-title">
        <div className="home-section-heading home-section-heading-inline">
          <div>
            <span className="eyebrow">
              <LocalizedText english={messages.en.homeVariablesEyebrow} urdu={messages.ur.homeVariablesEyebrow} />
            </span>
            <h2 id="home-variables-title">
              <LocalizedText english={messages.en.homeVariablesTitle} urdu={messages.ur.homeVariablesTitle} />
            </h2>
            <p>
              <LocalizedText english={messages.en.homeVariablesSubtitle} urdu={messages.ur.homeVariablesSubtitle} />
            </p>
          </div>
          <span className="demo-badge">
            <LocalizedText english={messages.en.homeDemoBadge} urdu={messages.ur.homeDemoBadge} />
          </span>
        </div>
        <div className="home-variable-grid">
          {variables.map((variable) => {
            const Icon = variableIcons[variable.id];
            const descriptionKey = variableDescriptionKeys[variable.id];
            return (
              <a
                className="home-variable-card"
                href={`/explore?variable=${variable.id}`}
                key={variable.id}
              >
                <Icon className="home-variable-icon" aria-hidden="true" />
                <span className="home-variable-card-title">
                  <LocalizedText
                    english={getVariableLabel(variable.id, "en")}
                    urdu={getVariableLabel(variable.id, "ur")}
                  />
                </span>
                <span className="home-variable-description">
                  <LocalizedText
                    english={messages.en[descriptionKey]}
                    urdu={messages.ur[descriptionKey]}
                  />
                </span>
                <span className="home-variable-unit" dir="ltr">{variable.unit}</span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="home-section page-shell" aria-labelledby="home-insights-title">
        <div className="home-section-heading home-section-heading-inline">
          <div>
            <span className="eyebrow">
              <LocalizedText english={messages.en.homeInsightsEyebrow} urdu={messages.ur.homeInsightsEyebrow} />
            </span>
            <h2 id="home-insights-title">
              <LocalizedText english={messages.en.homeInsightsTitle} urdu={messages.ur.homeInsightsTitle} />
            </h2>
            <p>
              <LocalizedText english={messages.en.homeInsightsSubtitle} urdu={messages.ur.homeInsightsSubtitle} />
            </p>
          </div>
          <span className="demo-badge">
            <LocalizedText english={messages.en.homeDemoBadge} urdu={messages.ur.homeDemoBadge} />
          </span>
        </div>
        <div className="home-insight-grid">
          {insights.map((insight) => {
            const sentenceEnglish = getTrendSentence(insight, "en");
            const sentenceUrdu = getTrendSentence(insight, "ur");
            return (
              <article className="home-insight-card" key={`${insight.variable}-${insight.region}`}>
                <span className="demo-badge">
                  <LocalizedText english={messages.en.homeDemoBadge} urdu={messages.ur.homeDemoBadge} />
                </span>
                <div className="home-insight-heading">
                  <h3>
                    <LocalizedText
                      english={getVariableLabel(insight.variable, "en")}
                      urdu={getVariableLabel(insight.variable, "ur")}
                    />
                  </h3>
                  <span>
                    <LocalizedText
                      english={getRegionLabel(insight.region, "en")}
                      urdu={getRegionLabel(insight.region, "ur")}
                    />
                  </span>
                </div>
                <p className="home-insight-sentence">
                  <LocalizedText english={sentenceEnglish} urdu={sentenceUrdu} />
                </p>
                <div className="home-insight-metric-row">
                  <span className="home-insight-direction">
                    <TrendDirectionIcon direction={insight.direction} />
                    <LocalizedText
                      english={getTrendDirectionLabel(insight.direction, "en")}
                      urdu={getTrendDirectionLabel(insight.direction, "ur")}
                    />
                  </span>
                  <span className="home-significance">
                    {insight.significant ? (
                      <CheckCircle2 aria-hidden="true" />
                    ) : (
                      <CircleDashed aria-hidden="true" />
                    )}
                    <LocalizedText
                      english={insight.significant ? messages.en.trendSignificant : messages.en.trendNotSignificant}
                      urdu={insight.significant ? messages.ur.trendSignificant : messages.ur.trendNotSignificant}
                    />
                  </span>
                </div>
                <a
                  className="home-card-link"
                  href={`/explore?variable=${insight.variable}&region=${insight.region}&start=${insight.start}&end=${insight.end}`}
                >
                  <LocalizedText english={messages.en.homeInsightLink} urdu={messages.ur.homeInsightLink} />
                  <ArrowRight className="home-link-arrow" aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>
      </section>

      <section className="home-section page-shell home-how-section" aria-labelledby="how-title">
        <div className="home-section-heading">
          <span className="eyebrow">
            <LocalizedText english={messages.en.homeHowEyebrow} urdu={messages.ur.homeHowEyebrow} />
          </span>
          <h2 id="how-title">
            <LocalizedText english={messages.en.homeHowTitle} urdu={messages.ur.homeHowTitle} />
          </h2>
          <p>
            <LocalizedText english={messages.en.homeHowSubtitle} urdu={messages.ur.homeHowSubtitle} />
          </p>
        </div>
        <div className="home-steps-grid">
          <article className="home-step-card">
            <span className="home-step-number">
              <LocalizedText english={messages.en.homeStepOneLabel} urdu={messages.ur.homeStepOneLabel} />
            </span>
            <h3><LocalizedText english={messages.en.homeStepOneTitle} urdu={messages.ur.homeStepOneTitle} /></h3>
            <p><LocalizedText english={messages.en.homeStepOneText} urdu={messages.ur.homeStepOneText} /></p>
          </article>
          <article className="home-step-card">
            <span className="home-step-number">
              <LocalizedText english={messages.en.homeStepTwoLabel} urdu={messages.ur.homeStepTwoLabel} />
            </span>
            <h3><LocalizedText english={messages.en.homeStepTwoTitle} urdu={messages.ur.homeStepTwoTitle} /></h3>
            <p><LocalizedText english={messages.en.homeStepTwoText} urdu={messages.ur.homeStepTwoText} /></p>
          </article>
          <article className="home-step-card">
            <span className="home-step-number">
              <LocalizedText english={messages.en.homeStepThreeLabel} urdu={messages.ur.homeStepThreeLabel} />
            </span>
            <h3><LocalizedText english={messages.en.homeStepThreeTitle} urdu={messages.ur.homeStepThreeTitle} /></h3>
            <p><LocalizedText english={messages.en.homeStepThreeText} urdu={messages.ur.homeStepThreeText} /></p>
          </article>
        </div>
      </section>

      <section className="home-credits page-shell" aria-labelledby="home-credits-title">
        <div>
          <span className="eyebrow">
            <LocalizedText english={messages.en.homeCreditsEyebrow} urdu={messages.ur.homeCreditsEyebrow} />
          </span>
          <h2 id="home-credits-title">
            <LocalizedText english={messages.en.homeCreditsTitle} urdu={messages.ur.homeCreditsTitle} />
          </h2>
          <p><LocalizedText english={messages.en.homeCreditsDemo} urdu={messages.ur.homeCreditsDemo} /></p>
        </div>
        <div className="home-credit-links">
          <a href="https://www.geoboundaries.org" target="_blank" rel="noopener noreferrer">
            <LocalizedText english={messages.en.homeBoundaryCredit} urdu={messages.ur.homeBoundaryCredit} />
          </a>
          <a href="/about">
            <LocalizedText english={messages.en.homeAboutLink} urdu={messages.ur.homeAboutLink} />
          </a>
        </div>
      </section>

      <section className="home-cta page-shell" aria-labelledby="home-cta-title">
        <div>
          <span className="eyebrow">
            <LocalizedText english={messages.en.homeCtaEyebrow} urdu={messages.ur.homeCtaEyebrow} />
          </span>
          <h2 id="home-cta-title">
            <LocalizedText english={messages.en.homeCtaTitle} urdu={messages.ur.homeCtaTitle} />
          </h2>
          <p><LocalizedText english={messages.en.homeCtaText} urdu={messages.ur.homeCtaText} /></p>
        </div>
        <div className="home-cta-actions">
          <a className="primary-button" href="/explore">
            <LocalizedText english={messages.en.homePrimaryCta} urdu={messages.ur.homePrimaryCta} />
            <ArrowRight aria-hidden="true" className="home-link-arrow" />
          </a>
          <a className="home-methods-link" href="/about#about-methods-title">
            <LocalizedText english={messages.en.homeMethodsLink} urdu={messages.ur.homeMethodsLink} />
          </a>
        </div>
      </section>
    </main>
  );
}
