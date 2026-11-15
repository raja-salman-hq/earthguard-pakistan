"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock3, ExternalLink, ThermometerSun, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { getFaisalabadWeather } from "@/lib/api/weather";
import { useMessages } from "@/hooks/use-messages";

type DeviceTime = {
  time: string;
  weekday: string;
  date: string;
  timezone: string;
};

let deviceTimeSnapshot: DeviceTime | null = null;
const deviceTimeListeners = new Set<() => void>();
const liveCardListeners = new Set<() => void>();
let liveCardFallback = false;

function subscribeToDeviceTime(listener: () => void): () => void {
  deviceTimeListeners.add(listener);
  deviceTimeSnapshot = formatDeviceTime();
  listener();
  const timer = window.setInterval(() => {
    deviceTimeSnapshot = formatDeviceTime();
    deviceTimeListeners.forEach((currentListener) => currentListener());
  }, 30_000);
  return () => {
    window.clearInterval(timer);
    deviceTimeListeners.delete(listener);
  };
}

function getDeviceTimeSnapshot(): DeviceTime | null {
  return deviceTimeSnapshot;
}

function getServerDeviceTimeSnapshot(): DeviceTime | null {
  return null;
}

function subscribeToLiveCard(listener: () => void): () => void {
  liveCardListeners.add(listener);
  return () => liveCardListeners.delete(listener);
}

function getLiveCardSnapshot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const saved = window.sessionStorage.getItem("earthguard-live-card-collapsed");
    return saved === "1" || (saved === null && window.innerWidth < 681);
  } catch {
    return liveCardFallback;
  }
}

function formatDeviceTime(): DeviceTime {
  const now = new Date();
  return {
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(now),
    weekday: new Intl.DateTimeFormat(undefined, { weekday: "long" }).format(now),
    date: new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(now),
    timezone: new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(now)
      .find((part) => part.type === "timeZoneName")?.value ?? "",
  };
}

export function LiveNowCard() {
  const messages = useMessages();
  const collapsed = useSyncExternalStore(subscribeToLiveCard, getLiveCardSnapshot, () => false);
  const deviceTime = useSyncExternalStore(
    subscribeToDeviceTime,
    getDeviceTimeSnapshot,
    getServerDeviceTimeSnapshot,
  );
  const weatherQuery = useQuery({
    queryKey: ["weather", "faisalabad"],
    queryFn: getFaisalabadWeather,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  function toggleCollapsed() {
    const next = !collapsed;
    try {
      window.sessionStorage.setItem("earthguard-live-card-collapsed", next ? "1" : "0");
    } catch {
      liveCardFallback = next;
    }
    liveCardListeners.forEach((listener) => listener());
  }

  const temperature = weatherQuery.data?.current.temperature_2m;

  return (
    <article className={`live-now-card${collapsed ? " is-collapsed" : ""}`} aria-label="Live Faisalabad weather and device time">
      {collapsed ? (
        <button
          className="live-now-collapsed"
          type="button"
          aria-expanded="false"
          aria-label="Expand live card"
          onClick={toggleCollapsed}
        >
          <span aria-hidden="true">●</span>
          <bdi dir="ltr">{temperature === undefined ? "—" : `${temperature.toFixed(1)} °C`} · {deviceTime?.time ?? "—"}</bdi>
          <span className="live-now-expand">+</span>
        </button>
      ) : (
        <>
      <div className="live-now-heading">
        <span className="live-now-icon" aria-hidden="true"><ThermometerSun size={17} /></span>
        <div>
          <strong>{messages.liveNow}</strong>
          <span>Faisalabad, Punjab</span>
        </div>
        <button className="live-now-close" type="button" aria-label="Collapse live card" aria-expanded="true" onClick={toggleCollapsed}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="live-now-weather">
        {weatherQuery.isPending ? (
          <div className="live-now-temperature-skeleton" role="status" aria-label="Loading live temperature" />
        ) : weatherQuery.isError ? (
          <p className="live-now-error" role="status">{messages.liveTemperatureUnavailable}</p>
        ) : (
          <>
            <strong dir="ltr">{weatherQuery.data.current.temperature_2m.toFixed(1)}°C</strong>
            <span>{messages.liveFeelsLike} {weatherQuery.data.current.apparent_temperature.toFixed(1)}°C</span>
          </>
        )}
      </div>
      {deviceTime ? (
        <div className="live-now-time" dir="ltr">
          <Clock3 size={15} aria-hidden="true" />
          <span>
            <b>{deviceTime.time}</b>
            <small>{deviceTime.weekday}, {deviceTime.date}</small>
          </span>
          <bdi className="live-now-timezone">{deviceTime.timezone}</bdi>
        </div>
      ) : (
        <div className="live-now-time-skeleton" role="status" aria-label="Loading device time" />
      )}
      <p className="live-now-note">
        {messages.liveWeatherNote}
      </p>
      <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="live-now-attribution">
        {messages.liveWeatherAttribution} <ExternalLink size={12} aria-hidden="true" />
      </a>
        </>
      )}
    </article>
  );
}
