import { useEffect, useState } from "react";

export type WeatherKind = "sunny" | "cloudy" | "rainy" | "snowy";

export interface Weather {
  tempC: number;
  kind: WeatherKind;
  label: string;
  emoji: string;
  city: string;
  windKmh?: number;
  loading: boolean;
  error?: string;
}

// WMO weathercode mapping (https://open-meteo.com/en/docs)
function fromCode(code: number): { kind: WeatherKind; label: string; emoji: string } {
  if (code === 0) return { kind: "sunny", label: "Soleggiato", emoji: "☀️" };
  if (code === 1) return { kind: "sunny", label: "Sereno", emoji: "🌤️" };
  if (code === 2) return { kind: "cloudy", label: "Poco nuvoloso", emoji: "⛅" };
  if (code === 3) return { kind: "cloudy", label: "Nuvoloso", emoji: "☁️" };
  if (code === 45 || code === 48) return { kind: "cloudy", label: "Nebbia", emoji: "🌫️" };
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { kind: "rainy", label: "Pioggia", emoji: "🌧️" };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { kind: "snowy", label: "Neve", emoji: "❄️" };
  }
  if (code >= 95) return { kind: "rainy", label: "Temporale", emoji: "⛈️" };
  return { kind: "cloudy", label: "Variabile", emoji: "🌥️" };
}

async function getPosition(): Promise<GeolocationPosition | null> {
  if (!("geolocation" in navigator)) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { timeout: 6000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const r = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=it`);
    if (!r.ok) throw new Error("geo");
    const j = await r.json();
    return j.city || j.locality || j.principalSubdivision || "Dove sei";
  } catch {
    return "Dove sei";
  }
}

interface Cache { at: number; lat: number; lon: number; data: Omit<Weather, "loading"> }
const KEY = "weather-cache-v1";

function readCache(): Cache | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cache;
    if (Date.now() - c.at < 30 * 60 * 1000) return c; // 30 min TTL
    return null;
  } catch { return null; }
}

function writeCache(c: Cache) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* storage full / private window */ }
}

// Firenze fallback coords
const FALLBACK = { lat: 43.7696, lon: 11.2558, city: "Firenze" };

export function useWeather(): Weather {
  const [state, setState] = useState<Weather>(() => {
    const c = readCache();
    if (c) return { ...c.data, loading: false };
    return { tempC: 22, kind: "sunny", label: "—", emoji: "☀️", city: "Firenze", loading: true };
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pos = await getPosition();
      const lat = pos?.coords.latitude ?? FALLBACK.lat;
      const lon = pos?.coords.longitude ?? FALLBACK.lon;
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto`;
        const [wRes, city] = await Promise.all([
          fetch(url),
          pos ? reverseGeocode(lat, lon) : Promise.resolve(FALLBACK.city),
        ]);
        if (!wRes.ok) throw new Error("meteo " + wRes.status);
        const j = await wRes.json();
        const code = j.current?.weather_code ?? 0;
        const temp = Math.round(j.current?.temperature_2m ?? 0);
        const wind = j.current?.wind_speed_10m ? Math.round(j.current.wind_speed_10m) : undefined;
        const m = fromCode(code);
        const data: Omit<Weather, "loading"> = { tempC: temp, kind: m.kind, label: m.label, emoji: m.emoji, city, windKmh: wind };
        if (!cancelled) setState({ ...data, loading: false });
        writeCache({ at: Date.now(), lat, lon, data });
      } catch (e) {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: (e as Error).message }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}
