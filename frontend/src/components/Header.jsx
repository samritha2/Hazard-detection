import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Activity, Wifi, WifiOff, Bell, BellOff, 
  Smartphone, BarChart3, MapPin, RefreshCw, Radio, Sparkles, Terminal, Database, Cloud 
} from 'lucide-react';

export default function Header({ 
  isConnected, 
  activeAlertsCount, 
  criticalCount, 
  avgLatency, 
  soundEnabled, 
  setSoundEnabled, 
  currentTab, 
  setCurrentTab,
  onRefresh
}) {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bento-card" style={{ margin: '1rem 1.5rem', padding: '0.9rem 1.5rem', background: 'rgba(10, 15, 30, 0.85)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Left: Futuristic Brand Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
          <div style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 20px rgba(245, 158, 11, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <ShieldAlert size={24} color="#000" strokeWidth={2.6} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
                HAZARDSENSE <span style={{ color: 'var(--hazard-amber)', fontSize: '0.85rem', fontWeight: 700 }}>OS</span>
              </span>
              <span className="pill pill-high shimmer-badge" style={{ fontSize: '0.65rem' }}>
                <Sparkles size={11} /> IEEE 830-1998
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <span>Cross-Modal Hazard AI</span>
              <span style={{ color: 'var(--border-medium)' }}>•</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{time}</span>
            </div>
          </div>
        </div>

        {/* Center: 21st.dev Metric HUD Gauges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
          
          {/* Real-time WebSocket Sonar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            background: 'rgba(0, 0, 0, 0.45)', 
            padding: '0.45rem 0.9rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <span className={isConnected ? "beacon-sonar" : "beacon-sonar beacon-sonar-red"} />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Telemetry Feed
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: isConnected ? '#34d399' : '#fb7185', fontFamily: 'var(--font-mono)' }}>
                {isConnected ? "WS STREAM ACTIVE" : "OFFLINE"}
              </div>
            </div>
          </div>

          {/* Anomaly Latency Gauge (NFR-2 <2.0s) */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            background: 'rgba(0, 0, 0, 0.45)', 
            padding: '0.45rem 0.9rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <Radio size={16} color="var(--neon-cyan)" />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                NFR-2 Latency
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: avgLatency < 2000 ? 'var(--neon-cyan)' : 'var(--hazard-red)', fontFamily: 'var(--font-mono)' }}>
                {avgLatency} ms <span style={{ color: '#34d399', fontSize: '0.7rem' }}>(&lt;2.0s PASS)</span>
              </div>
            </div>
          </div>

          {/* Critical Hazard Alert Meter */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            background: criticalCount > 0 ? 'var(--hazard-red-subtle)' : 'rgba(0, 0, 0, 0.45)', 
            padding: '0.45rem 0.9rem', 
            borderRadius: '10px', 
            border: criticalCount > 0 ? '1px solid rgba(244, 63, 94, 0.45)' : '1px solid var(--border-subtle)' 
          }}>
            <Activity size={16} color={criticalCount > 0 ? "var(--hazard-red)" : "var(--text-secondary)"} />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Critical Active
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: criticalCount > 0 ? '#fb7185' : '#fff', fontFamily: 'var(--font-mono)' }}>
                {criticalCount} Hazards
              </div>
            </div>
          </div>

          {/* Firebase Cloud Database Status */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.6rem', 
            background: 'rgba(0, 0, 0, 0.45)', 
            padding: '0.45rem 0.9rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <Database size={15} color="var(--hazard-amber)" />
            <div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Database
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
                CLOUD FIRESTORE
              </div>
            </div>
          </div>

        </div>

        {/* Right: 21st.dev Segmented Navigation Tabs & Quick Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.5)', 
            padding: '4px', 
            borderRadius: '12px', 
            display: 'flex', 
            gap: '4px', 
            border: '1px solid var(--border-subtle)' 
          }}>
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className={`btn ${currentTab === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <MapPin size={14} /> Command Map
            </button>
            <button 
              onClick={() => setCurrentTab('analytics')}
              className={`btn ${currentTab === 'analytics' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <BarChart3 size={14} /> Safety KPIs
            </button>
            <button 
              onClick={() => setCurrentTab('simulator')}
              className={`btn ${currentTab === 'simulator' ? 'btn-cyan' : 'btn-secondary'}`}
              style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem' }}
            >
              <Smartphone size={14} /> Upload Media
            </button>
          </div>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)} 
            className="btn btn-secondary" 
            title={soundEnabled ? "Mute Hazard Siren" : "Unmute Hazard Siren"}
            style={{ padding: '0.5rem', width: '38px', height: '38px', borderRadius: '10px' }}
          >
            {soundEnabled ? <Bell size={16} color="var(--hazard-amber)" /> : <BellOff size={16} color="var(--text-muted)" />}
          </button>

          <button 
            onClick={onRefresh} 
            className="btn btn-secondary" 
            title="Refresh Server Stream"
            style={{ padding: '0.5rem', width: '38px', height: '38px', borderRadius: '10px' }}
          >
            <RefreshCw size={16} />
          </button>

        </div>

      </div>
    </header>
  );
}
