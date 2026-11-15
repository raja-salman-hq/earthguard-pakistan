"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock3, ExternalLink, ThermometerSun } from "lucide-react";
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

  return (
    <article className="live-now-card" aria-label="Live Faisalabad weather and device time">
      <div className="live-now-heading">
        <span className="live-now-icon" aria-hidden="true"><ThermometerSun size={17} /></span>
        <div>
          <strong>{messages.liveNow}</strong>
          <span>Faisalabad, Punjab</span>
        </div>
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
          <span>{deviceTime.time} · {deviceTime.weekday}, {deviceTime.date} · {deviceTime.timezone}</span>
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
    </article>
  );
}
