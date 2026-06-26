import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { Company, statusColors } from "../lib/data";
import NLScatter from "./NLScatter";

export const MAPBOX_TOKEN_KEY = "mooizicht_mapbox_token";

export function getMapboxToken(): string {
  const env = (import.meta as any).env?.VITE_MAPBOX_TOKEN as string | undefined;
  return localStorage.getItem(MAPBOX_TOKEN_KEY) || env || "";
}

/** Shared live Mapbox map. Falls back to the static NL scatter when no token. */
export default function CompanyMap({
  companies,
  height = 300,
  zoom = 6.3,
  onSelect,
}: {
  companies: Company[];
  height?: number;
  zoom?: number;
  onSelect?: (c: Company) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const token = getMapboxToken();

  // init map once
  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [5.2913, 52.1326],
      zoom,
      attributionControl: false,
    });
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [token, zoom]);

  // sync markers whenever companies change. Robust against Mapbox's async style
  // load and React StrictMode's double-mount (which can otherwise leave markers
  // bound to a discarded map instance → nothing rendered).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    let disposed = false;
    const place = () => {
      if (disposed || !mapRef.current) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = companies
        .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
        .map((c) => {
        const col = statusColors[c.status];
        // Mapbox owns the root element's `transform` (for positioning), so the
        // hover scale must live on an inner dot — otherwise it snaps to (0,0).
        const el = document.createElement("div");
        el.style.cssText = "width:15px;height:15px;cursor:pointer";
        const dot = document.createElement("div");
        dot.style.cssText = `width:15px;height:15px;border-radius:999px;background:${col};box-shadow:0 0 0 4px ${col}26,0 0 12px ${col}aa;border:1.5px solid rgba(255,255,255,0.65);transition:transform .15s;transform-origin:center`;
        el.appendChild(dot);
        el.onmouseenter = () => (dot.style.transform = "scale(1.4)");
        el.onmouseleave = () => (dot.style.transform = "scale(1)");
        if (onSelect) el.onclick = () => onSelect(c);
        return new mapboxgl.Marker(el).setLngLat([c.lng, c.lat]).addTo(map);
      });
    };
    if (map.isStyleLoaded()) place();
    map.on("load", place);
    map.on("style.load", place);
    map.once("idle", place);
    return () => {
      disposed = true;
      map.off("load", place);
      map.off("style.load", place);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [companies, onSelect, token]);

  if (!token) {
    return <NLScatter />;
  }
  return <div ref={containerRef} style={{ width: "100%", height, borderRadius: 12, overflow: "hidden" }} />;
}
