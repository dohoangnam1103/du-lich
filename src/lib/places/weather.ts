// Current weather via Open-Meteo (free, no API key required).

type FetchImpl = typeof fetch;

const API = "https://api.open-meteo.com/v1/forecast";

export interface Weather {
  temperature: number; // °C
  code: number; // WMO weather code
  icon: string;
  description: string;
}

// Maps WMO weather codes to an emoji + Vietnamese description.
function describe(code: number): { icon: string; description: string } {
  if (code === 0) return { icon: "☀️", description: "Trời quang" };
  if (code <= 2) return { icon: "🌤️", description: "Ít mây" };
  if (code === 3) return { icon: "☁️", description: "Nhiều mây" };
  if (code <= 48) return { icon: "🌫️", description: "Sương mù" };
  if (code <= 57) return { icon: "🌦️", description: "Mưa phùn" };
  if (code <= 67) return { icon: "🌧️", description: "Mưa" };
  if (code <= 77) return { icon: "🌨️", description: "Tuyết" };
  if (code <= 82) return { icon: "🌧️", description: "Mưa rào" };
  if (code <= 86) return { icon: "🌨️", description: "Mưa tuyết" };
  if (code <= 99) return { icon: "⛈️", description: "Dông bão" };
  return { icon: "🌡️", description: "Không rõ" };
}

export async function getWeather(
  lat: number,
  lng: number,
  options: { fetchImpl?: FetchImpl } = {},
): Promise<Weather | null> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const url =
    `${API}?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,weather_code&timezone=auto`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };
    const cur = data.current;
    if (!cur || typeof cur.temperature_2m !== "number") return null;
    const code = cur.weather_code ?? 0;
    const { icon, description } = describe(code);
    return {
      temperature: Math.round(cur.temperature_2m),
      code,
      icon,
      description,
    };
  } catch {
    return null;
  }
}
