import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import LiveIncidentFeed from './components/LiveIncidentFeed';
import SpatialMapView from './components/SpatialMapView';
import DetectionInspectorModal from './components/DetectionInspectorModal';
import SafetyAnalytics from './components/SafetyAnalytics';
import MediaUploadPanel from './components/MediaUploadPanel';
const API_BASE = 'http://localhost:8000';
const WS_BASE = 'ws://localhost:8000/ws/live-feed';

// Synthesizer beep for safety alerts without needing external mp3 files
const playSafetyAlarm = (severity) => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = severity === 'CRITICAL' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(severity === 'CRITICAL' ? 880 : 587.33, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch (e) {
    // Audio context may require initial user gesture
  }
};

export default function App() {
  const [incidents, setIncidents] = useState([]);
  const [zones, setZones] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard', 'analytics', 'simulator'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const wsRef = useRef(null);

  // Fetch baseline data
  const fetchData = async () => {
    try {
      const [incRes, zoneRes, workerRes, analyticsRes] = await Promise.all([
        fetch(`${API_BASE}/api/incidents`),
        fetch(`${API_BASE}/api/zones`),
        fetch(`${API_BASE}/api/workers`),
        fetch(`${API_BASE}/api/analytics`)
      ]);

      if (incRes.ok) setIncidents(await incRes.json());
      if (zoneRes.ok) setZones(await zoneRes.json());
      if (workerRes.ok) setWorkers(await workerRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (err) {
      console.error("Error fetching baseline data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Real-Time WebSocket Connection (REQ-3.1)
  useEffect(() => {
    let reconnectTimeout = null;

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_BASE);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          console.log("[WebSocket] Connected to Live Feed");
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { type, data } = message;

            if (type === 'NEW_INCIDENT') {
              setIncidents((prev) => [data, ...prev.filter(i => i.id !== data.id)]);
              if (soundEnabled) playSafetyAlarm(data.severity);
              fetchAnalytics();
            } else if (type === 'INCIDENT_UPDATED' || type === 'INCIDENT_STATUS_CHANGED') {
              setIncidents((prev) => prev.map(i => i.id === data.id ? data : i));
              if (selectedIncident && selectedIncident.id === data.id) {
                setSelectedIncident(data);
              }
              fetchAnalytics();
            } else if (type === 'BATCH_SYNCED') {
              if (data.incidents) {
                setIncidents((prev) => {
                  const incomingIds = new Set(data.incidents.map(i => i.id));
                  const kept = prev.filter(i => !incomingIds.has(i.id));
                  return [...data.incidents, ...kept];
                });
              }
              if (soundEnabled) playSafetyAlarm('HIGH');
              fetchAnalytics();
            }
          } catch (e) {
            console.error("Failed to parse WS message:", e);
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          console.log("[WebSocket] Disconnected. Reconnecting in 3s...");
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        };

        ws.onerror = (err) => {
          console.error("[WebSocket Error]:", err);
          ws.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [soundEnabled, selectedIncident]);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/analytics`);
      if (res.ok) setAnalytics(await res.json());
    } catch (e) {}
  };

  // Update incident status (Resolved / Acknowledged)
  const handleUpdateStatus = async (id, status, notes = '') => {
    try {
      const res = await fetch(`${API_BASE}/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes })
      });
      if (res.ok) {
        const json = await res.json();
        setIncidents((prev) => prev.map(i => i.id === id ? json.incident : i));
        if (selectedIncident?.id === id) setSelectedIncident(json.incident);
        fetchAnalytics();
      }
    } catch (e) {
      console.error("Error updating incident status:", e);
    }
  };

  // Report new incident from simulator
  const handleSendReport = async (payload) => {
    const res = await fetch(`${API_BASE}/api/incidents/report-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Failed to report incident");
    return await res.json();
  };

  // Offline batch sync
  const handleBatchSync = async (queuedIncidents, workerId) => {
    const res = await fetch(`${API_BASE}/api/incidents/sync-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        worker_id: workerId,
        incidents: queuedIncidents,
        client_timestamp: new Date().toISOString()
      })
    });
    if (!res.ok) throw new Error("Batch sync failed");
    return await res.json();
  };

  // Trigger YOLO Webhook Hook (CH-81 integration test)
  const handleTriggerYoloWebhook = async (incidentId, detections) => {
    const res = await fetch(`${API_BASE}/api/yolo/inference-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incident_id: incidentId,
        detections: detections,
        model_version: 'yolov8-custom-hazard-v1',
        inference_time_ms: 38.5
      })
    });
    if (res.ok) {
      const json = await res.json();
      if (selectedIncident?.id === incidentId) setSelectedIncident(json.incident);
    }
  };

  const activeAlertsCount = incidents.filter(i => i.status === 'NEW').length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' && i.status === 'NEW').length;
  const avgLatency = analytics?.kpis?.avg_latency_ms || 142;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      
      {/* 21st.dev Atmospheric Ambient Glow Orbs */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-cyan-500/10 to-transparent blur-[120px] rounded-full" />
        <div className="absolute top-1/3 -left-40 w-[450px] h-[450px] bg-gradient-to-r from-amber-500/05 to-transparent blur-[140px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[550px] h-[350px] bg-gradient-to-tl from-rose-500/05 to-transparent blur-[150px] rounded-full" />
      </div>

      <div className="relative z-10 flex flex-col flex-1">
        {/* Top Navigation & Status Bar */}
        <Header 
          isConnected={isConnected}
          activeAlertsCount={activeAlertsCount}
        criticalCount={criticalCount}
        avgLatency={avgLatency}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onRefresh={fetchData}
      />

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '0 1.5rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        
        {currentTab === 'dashboard' && (
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.2rem', minHeight: '680px' }}>
            {/* Left: Real-time Incident Feed */}
            <LiveIncidentFeed 
              incidents={incidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onUpdateStatus={handleUpdateStatus}
            />

            {/* Right: Spatial Map Overlay */}
            <SpatialMapView 
              incidents={incidents}
              zones={zones}
              workers={workers}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          </div>
        )}

        {currentTab === 'analytics' && (
          <SafetyAnalytics 
            analytics={analytics}
            zones={zones}
            workers={workers}
            incidents={incidents}
            onRefresh={fetchData}
          />
        )}

        {currentTab === 'simulator' && (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] p-6">
             <MediaUploadPanel workers={workers} zones={zones} />
          </div>
        )}

      </main>

      {/* Detection & Telemetry Modal Inspector */}
      {selectedIncident && (
        <DetectionInspectorModal 
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onUpdateStatus={handleUpdateStatus}
          onTriggerYoloWebhook={handleTriggerYoloWebhook}
        />
      )}

      </div>
    </div>
  );
}

