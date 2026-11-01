"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet's default icon path issues with Webpack
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Create custom hospital icon for consistency with patient map
const hospitalIcon = L.divIcon({
  html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
    <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#059669" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="9" r="3.5" fill="white"/>
  </svg>`,
  className: "custom-marker-icon",
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true });
  }, [center, map]);
  return null;
}

interface AdminLocationMapProps {
  position: [number, number] | null;
  onPositionChange: (pos: [number, number]) => void;
}

export default function AdminLocationMap({ position, onPositionChange }: AdminLocationMapProps) {
  const [center, setCenter] = useState<[number, number]>(position || [22.3072, 73.1812]);
  const markerRef = useRef<L.Marker>(null);
  const [mapId] = useState(() => Math.random().toString(36));

  useEffect(() => {
    if (position && (position[0] !== center[0] || position[1] !== center[1])) {
      setCenter(position);
    }
  }, [position]);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          onPositionChange([latLng.lat, latLng.lng]);
          setCenter([latLng.lat, latLng.lng]);
        }
      },
    }),
    [onPositionChange]
  );

  function LocationMarker() {
    useMapEvents({
      click(e) {
        onPositionChange([e.latlng.lat, e.latlng.lng]);
        setCenter([e.latlng.lat, e.latlng.lng]);
      },
    });

    return position === null ? null : (
      <Marker
        draggable={true}
        eventHandlers={eventHandlers}
        position={position}
        ref={markerRef}
        icon={hospitalIcon}
      />
    );
  }

  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden border border-gray-200">
      <style>{`
        .custom-marker-icon { background: none !important; border: none !important; }
      `}</style>
      <MapContainer
        key={mapId}
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapUpdater center={center} />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}
