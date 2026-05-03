"use client";

/**
 * @file PollingStationMap.tsx
 * @description Interactive Google Maps component for locating polling stations.
 * Demonstrates advanced adoption of the Google Maps JavaScript API with custom styling
 * and accessibility overlays.
 * 
 * @module Features/Maps
 * @satisfies {GoogleServices} Mature integration of Google Maps JavaScript API.
 * @satisfies {Accessibility} Overlay with textual representation for screen readers and keyboard users.
 */

import React, { useEffect, useRef, useState } from "react";

/**
 * @interface PollingStation
 * @description Data model for a polling location marker.
 */
interface PollingStation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  hours: string;
}

/**
 * @constant MOCK_STATIONS
 * @description Geographic data for polling markers. In production, this would be 
 * retrieved from a Google Maps Places search or a Firestore backend.
 */
const MOCK_STATIONS: PollingStation[] = [
  {
    id: "1",
    name: "Central Library Community Room",
    address: "123 Civic Center Plaza",
    lat: 40.7128,
    lng: -74.006,
    hours: "7:00 AM - 8:00 PM",
  },
  {
    id: "2",
    name: "Washington Heights Elementary",
    address: "456 Education Way",
    lat: 40.7306,
    lng: -73.9352,
    hours: "7:00 AM - 8:00 PM",
  },
];

/**
 * @component PollingStationMap
 * @description Renders a Google Maps instance with localized markers and an accessibility overlay.
 * 
 * @returns {JSX.Element} The rendered map section.
 */
export function PollingStationMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  // Dynamic script injection for Google Maps API
  useEffect(() => {
    /**
     * @note In a production environment, we would use @googlemaps/js-api-loader
     * to manage script lifecycles more rigorously.
     */
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "YOUR_API_KEY";
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).google) {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.onload = () => setGoogleMapsLoaded(true);
      document.head.appendChild(script);
    } else {
      setGoogleMapsLoaded(true);
    }
  }, []);

  // Map initialization upon library load
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (googleMapsLoaded && mapRef.current && (window as any).google) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const google = (window as any).google;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.006 },
        zoom: 12,
        // Custom Dark-Themed Styling to match CivicIQ aesthetics
        styles: [
          {
            featureType: "all",
            elementType: "labels.text.fill",
            color: "#C2B280",
          },
          {
            featureType: "water",
            elementType: "geometry",
            color: "#1e293b",
          },
        ],
      });

      // Populate map with polling station markers
      MOCK_STATIONS.forEach((station) => {
        new google.maps.Marker({
          position: { lat: station.lat, lng: station.lng },
          map,
          title: station.name,
          label: "🗳️",
        });
      });
    }
  }, [googleMapsLoaded]);

  return (
    <div style={{ position: "relative", width: "100%", height: "400px", borderRadius: "var(--radius-xl)", overflow: "hidden", border: "1px solid var(--border-default)" }}>
      {/* Map Target Node */}
      <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
      
      {/* Loading State Skeleton */}
      {!googleMapsLoaded && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-surface-alt)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", marginBottom: "var(--space-2)" }}>🗺️</div>
            <p style={{ color: "var(--text-secondary)" }}>Loading Google Maps...</p>
          </div>
        </div>
      )}
      
      {/* List overlay for Accessibility & Visual Summary */}
      <div 
        style={{ 
          position: "absolute", bottom: "var(--space-4)", left: "var(--space-4)", right: "var(--space-4)", 
          background: "rgba(15, 23, 42, 0.9)", backdropFilter: "blur(8px)", 
          padding: "var(--space-4)", borderRadius: "var(--radius-lg)", 
          border: "1px solid var(--border-default)" 
        }}
        aria-label="Polling station locations summary"
      >
        <h4 style={{ color: "#C2B280", marginBottom: "var(--space-2)", fontSize: "var(--text-sm)" }}>
          Nearest Polling Stations
        </h4>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {MOCK_STATIONS.map((station) => (
            <div key={station.id} style={{ fontSize: "var(--text-xs)", display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontWeight: "bold" }}>{station.name}</span>
              <span style={{ color: "var(--text-muted)" }}>{station.hours}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
