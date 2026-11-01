"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Navigation, Star, Phone, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

// Custom SVG-based marker icons for a modern look with glowing effect
const createCustomIcon = (color: string, isActive: boolean) => {
  const size = isActive ? 48 : 36;
  const shadowOpacity = isActive ? 0.6 : 0.3;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}">
    <defs>
      <filter id="glow-${color.replace('#', '')}">
        <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
    <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="${color}" filter="url(#glow-${color.replace('#', '')})" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.8"/>
    <circle cx="12" cy="9" r="3.5" fill="#ffffff"/>
  </svg>`;
  
  return L.divIcon({
    html: `<div style="filter: drop-shadow(0 4px 6px rgba(0,0,0,${shadowOpacity})); transition: all 0.3s ease;">${svg}</div>`,
    className: "custom-marker-icon",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 4],
  });
};

const hospitalIcon = createCustomIcon("#10b981", false); // Emerald
const emergencyIcon = createCustomIcon("#ef4444", false); // Red

// Using an SVG-based custom icon that matches the blue "H" marker design
const activeHospitalIcon = L.divIcon({
  html: `<div style="filter: drop-shadow(0 8px 12px rgba(37,99,235,0.5)); transition: all 0.3s ease;">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48">
      <path d="M12 0C7.03 0 3 4.03 3 9c0 6.75 9 15 9 15s9-8.25 9-15c0-4.97-4.03-9-9-9z" fill="#2563eb" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="9" r="5.5" fill="#ffffff"/>
      <text x="12" y="11.5" font-family="Arial, sans-serif" font-weight="900" font-size="7.5" fill="#2563eb" text-anchor="middle">H</text>
    </svg>
  </div>`,
  className: "custom-marker-icon transition-all duration-300 transform scale-110",
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -44],
});

// Removed Cluster icon setup

// User location icon
const userLocationIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(59,130,246,0.25), 0 2px 8px rgba(0,0,0,0.15);"></div>`,
  className: "user-location-icon",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to handle map centering with smooth animation
function MapUpdater({ center, zoom, trigger }: { center: [number, number]; zoom?: number; trigger?: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      // Use setView instead of flyTo to prevent animation aborts on marker click
      map.setView(center, zoom || 15, {
        animate: true,
        duration: 1
      });
    }
  }, [center[0], center[1], zoom, map, trigger]);
  return null;
}

// Component to handle map resize
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

interface Hospital {
  id: number;
  name: string;
  city?: string;
  state?: string;
  phone?: string;
  rating?: number;
  doctor_count?: number;
  latitude?: string;
  longitude?: string;
  distance?: number;
  bed_count?: number;
  [key: string]: any;
}

interface InteractiveMapProps {
  hospitals: Hospital[];
  activeHospitalId: number | null;
  onMarkerClick: (id: number) => void;
  userLocation?: [number, number] | null;
  showUserLocation?: boolean;
  detailHospital?: any;
}

export default function InteractiveMap({
  hospitals,
  activeHospitalId,
  onMarkerClick,
  userLocation,
  showUserLocation = true,
  detailHospital,
}: InteractiveMapProps) {
  const [center, setCenter] = useState<[number, number]>([22.3072, 73.1812]); // Default Vadodara
  const [mapZoom, setMapZoom] = useState(12);
  const [centerTrigger, setCenterTrigger] = useState(0);

  useEffect(() => {
    if (userLocation) {
      setCenter(userLocation);
      setCenterTrigger(t => t + 1);
    } else if (hospitals.length > 0 && hospitals[0].latitude) {
      setCenter([parseFloat(hospitals[0].latitude), parseFloat(hospitals[0].longitude!)]);
      setCenterTrigger(t => t + 1);
    }
  }, [userLocation]);

  // Update center when active hospital or detail changes
  useEffect(() => {
    // If we have detailHospital and it matches active, use its precise location
    if (detailHospital && detailHospital.id === activeHospitalId && detailHospital.latitude) {
      setCenter([parseFloat(detailHospital.latitude), parseFloat(detailHospital.longitude)]);
      setMapZoom(15);
      setCenterTrigger(t => t + 1);
      return;
    }
    
    // Fallback to the list
    if (activeHospitalId) {
      const active = hospitals.find((h) => h.id === activeHospitalId);
      if (active && active.latitude) {
        setCenter([parseFloat(active.latitude), parseFloat(active.longitude!)]);
        setMapZoom(15);
        setCenterTrigger(t => t + 1);
      }
    }
  }, [activeHospitalId, hospitals, detailHospital]);

  return (
    <div className="w-full h-full relative">
      <style>{`
        .custom-marker-icon { background: none !important; border: none !important; }
        .user-location-icon { background: none !important; border: none !important; }
        .custom-cluster-icon { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { 
          background: rgba(17, 24, 39, 0.95) !important;
          backdrop-filter: blur(12px) !important;
          border-radius: 16px !important; 
          padding: 0 !important; 
          box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important; 
          border: 1px solid rgba(255,255,255,0.1) !important; 
          color: white !important;
        }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip { border-top-color: rgba(17, 24, 39, 0.95) !important; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important; border-radius: 12px !important; overflow: hidden; }
        .leaflet-control-zoom a { width: 36px !important; height: 36px !important; line-height: 36px !important; font-size: 16px !important; background-color: #1f2937 !important; color: #f3f4f6 !important; border-bottom-color: #374151 !important; }
        .leaflet-control-zoom a:hover { background-color: #374151 !important; }
      `}</style>
      <MapContainer
        center={center}
        zoom={mapZoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater center={center} zoom={mapZoom} trigger={centerTrigger} />
        <MapResizer />

        {/* User location marker */}
        {showUserLocation && userLocation && (
          <>
            <Circle
              center={userLocation}
              radius={200}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 1.5,
              }}
            />
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup closeButton={false}>
                <div className="p-3 text-center">
                  <p className="font-semibold text-sm text-gray-900">Your Location</p>
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Hospital markers */}
        <>
          {hospitals.map((hospital) => {
            if (!hospital.latitude || !hospital.longitude) return null;
            const isActive = hospital.id === activeHospitalId;

            return (
              <Marker
                key={hospital.id}
                position={[parseFloat(hospital.latitude), parseFloat(hospital.longitude)]}
                icon={isActive ? activeHospitalIcon : hospitalIcon}
                eventHandlers={{
                  click: () => onMarkerClick(hospital.id),
                }}
              >
                <Popup closeButton={false} className="hospital-popup">
                  <div className="p-4 min-w-[240px]">
                    <h3 className="font-bold text-base mb-1">{hospital.name}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-300 mb-3">
                      <span className="flex items-center">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400 mr-1" />
                        {hospital.rating || "New"}
                      </span>
                      <span className="flex items-center">
                        <Users className="w-3 h-3 mr-1 text-blue-400" />
                        {hospital.doctor_count || 0} Doctors
                      </span>
                      {hospital.bed_count !== undefined && (
                        <span className="flex items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1"></span>
                          {hospital.bed_count} Beds
                        </span>
                      )}
                      {hospital.distance && (
                        <span className="flex items-center ml-auto">
                          {hospital.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-8 text-xs bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg border-0"
                        onClick={() => onMarkerClick(hospital.id)}
                      >
                        View Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs rounded-lg border-gray-600 bg-gray-800 hover:bg-gray-700 hover:text-white"
                        onClick={() =>
                          window.open(
                            `https://maps.google.com/?q=${hospital.latitude},${hospital.longitude}`
                          )
                        }
                      >
                        <Navigation className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </>
      </MapContainer>

      {/* Floating My Location button */}
      <div className="absolute bottom-6 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-10 h-10 shadow-lg bg-white hover:bg-gray-50 border border-gray-200"
          onClick={() => {
            if (userLocation) {
              setCenter(userLocation);
              setMapZoom(14);
            } else {
              navigator.geolocation?.getCurrentPosition((pos) => {
                setCenter([pos.coords.latitude, pos.coords.longitude]);
                setMapZoom(14);
              });
            }
          }}
        >
          <Navigation className="w-4 h-4 text-blue-500" />
        </Button>
      </div>
    </div>
  );
}
