import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, AlertTriangle, User, Eye, Layers, Compass, Crosshair } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// Fix default Leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom HTML Icons
const createIncidentIcon = (severity, status) => {
  const isResolved = status === 'RESOLVED';
  const color = isResolved ? '#10b981' : (severity === 'CRITICAL' ? '#f43f5e' : (severity === 'HIGH' ? '#f59e0b' : '#38bdf8'));
  const pulse = !isResolved && severity === 'CRITICAL';

  const html = `
    <div style="
      position: relative;
      width: 28px;
      height: 28px;
      background: ${color};
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 16px ${color};
      color: #000;
      font-weight: bold;
      font-size: 11px;
    ">
      ${pulse ? `<div style="
        position: absolute;
        top: -6px;
        left: -6px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: ${color};
        opacity: 0.5;
        animation: pulse-ring 1.5s infinite ease-out;
      "></div>` : ''}
      ⚠️
    </div>
  `;

  return L.divIcon({
    className: 'custom-hazard-marker',
    html: html,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
};

const createWorkerIcon = (worker) => {
  const html = `
    <div style="
      width: 26px;
      height: 26px;
      background: #06b6d4;
      border: 2px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 12px rgba(6, 182, 212, 0.7);
      font-size: 12px;
    ">
      👷
    </div>
  `;

  return L.divIcon({
    className: 'custom-worker-marker',
    html: html,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

export default function SpatialMapView({ incidents, zones, workers, onSelectIncident }) {
  const centerPosition = [12.9724, 77.5948]; // Site Coordinates
  const [showWorkers, setShowWorkers] = useState(true);
  const [showZones, setShowZones] = useState(true);

  const getZoneColor = (riskLevel) => {
    switch (riskLevel?.toUpperCase()) {
      case 'CRITICAL': return { color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.2 };
      case 'HIGH': return { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.16 };
      case 'MEDIUM': return { color: '#38bdf8', fillColor: '#38bdf8', fillOpacity: 0.12 };
      default: return { color: '#10b981', fillColor: '#10b981', fillOpacity: 0.1 };
    }
  };

  return (
    <Card className="h-full relative overflow-hidden flex flex-col bg-slate-950/80 border-slate-800/80 backdrop-blur-xl shadow-2xl">
      
      {/* HUD Top Status Bar */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl px-3 py-1.5 shadow-lg">
          <Crosshair className="h-4 w-4 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
          <span className="text-xs font-bold text-white tracking-tight">
            Spatial Sentinel Overlay
          </span>
          <Badge variant="default" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
            EPSG:4326 PostGIS
          </Badge>
        </div>

        {/* Layer Controls */}
        <div className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl p-1 shadow-lg text-xs">
          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 ${
              showZones 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hazard Geofences
          </button>
          <button
            onClick={() => setShowWorkers(!showWorkers)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all duration-150 ${
              showWorkers 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Crew GPS ({workers.length})
          </button>
        </div>
      </div>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/90 backdrop-blur-md border border-slate-800/90 rounded-xl px-3 py-2 text-xs flex items-center gap-3 shadow-lg">
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px]">Critical Anomaly</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span className="text-[11px]">High Risk</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span className="text-[11px]">Worker GPS</span>
        </div>
      </div>

      {/* Leaflet Map */}
      <MapContainer 
        center={centerPosition} 
        zoom={18} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Construction Site Risk Zones */}
        {showZones && zones.map(zone => {
          const style = getZoneColor(zone.risk_level);
          return (
            <Polygon
              key={zone.id}
              positions={zone.polygon_coords}
              pathOptions={{
                color: style.color,
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
                weight: 2,
                dashArray: '5, 5'
              }}
            >
              <Tooltip sticky>
                <div className="p-1">
                  <div className="font-bold text-xs" style={{ color: style.color }}>{zone.name}</div>
                  <div className="text-[11px] text-slate-300">Risk Level: {zone.risk_level}</div>
                </div>
              </Tooltip>
            </Polygon>
          );
        })}

        {/* Hazard Incident Markers */}
        {incidents.map(inc => {
          const lat = inc.latitude || 12.9724;
          const lng = inc.longitude || 77.5948;
          return (
            <Marker
              key={inc.id}
              position={[lat, lng]}
              icon={createIncidentIcon(inc.severity, inc.status)}
            >
              <Popup>
                <div className="min-w-[200px] p-1 text-slate-900">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="capitalize text-amber-600 text-xs font-bold">
                      {inc.hazard_type?.replace('-', ' ')}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-mono">{inc.id}</span>
                  </div>
                  <p className="text-xs text-slate-700 my-1 leading-snug">
                    {inc.notes || 'Sensor anomaly reported.'}
                  </p>
                  <div className="text-[11px] text-slate-600 mb-2">
                    Worker: <strong>{inc.worker_name || inc.worker_id}</strong> ({inc.zone_id})
                  </div>
                  <button
                    onClick={() => onSelectIncident(inc)}
                    className="w-full py-1.5 px-2 bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-600 hover:to-rose-700 text-white font-bold text-xs rounded-md shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Eye className="h-3 w-3" /> Inspect Detections
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Worker GPS Markers */}
        {showWorkers && workers.map(w => {
          if (!w.last_lat || !w.last_lng) return null;
          return (
            <Marker
              key={w.id}
              position={[w.last_lat, w.last_lng]}
              icon={createWorkerIcon(w)}
            >
              <Popup>
                <div className="text-xs p-1 text-slate-900">
                  <strong className="text-cyan-600 font-bold">{w.name}</strong> ({w.id})
                  <div className="text-slate-600 mt-0.5">Role: {w.role}</div>
                  <div className="text-slate-600">Zone: {w.zone_id}</div>
                  <div className="text-emerald-600 font-semibold mt-0.5">● Status: {w.status}</div>
                </div>
              </Popup>
            </Marker>
          );
        })}

      </MapContainer>
    </Card>
  );
}
