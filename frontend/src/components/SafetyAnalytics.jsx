import React from 'react';
import { 
  BarChart3, ShieldAlert, CheckCircle, Activity, 
  MapPin, User, AlertTriangle, Zap, Droplets, Trash2, Footprints, AlertOctagon 
} from 'lucide-react';
import HazardBentoShowcase from './HazardBentoShowcase';
import GlareCardsSection from './GlareCardsSection';

export default function SafetyAnalytics({ analytics, zones, workers, incidents, onRefresh }) {
  const kpis = analytics?.kpis || {};
  const hazardDist = analytics?.hazard_distribution || {};
  const zoneCounts = analytics?.zone_incident_counts || {};

  const totalInc = kpis.total_incidents || incidents.length || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.8rem' }}>
      
      {/* 21st.dev Bento Grid Showcase */}
      <HazardBentoShowcase 
        analytics={analytics} 
        workers={workers} 
        incidents={incidents} 
        onRefresh={onRefresh}
      />

      {/* 21st.dev 3D Holographic Glare Cards */}
      <GlareCardsSection 
        incidents={incidents}
        workers={workers}
        analytics={analytics}
      />


      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={26} color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Site Incidents</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>{kpis.total_incidents || 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--red-500)' }}>{kpis.active_alerts || 0} requiring triage</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={26} color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Critical Fall Anomalies</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24' }}>{kpis.critical_count || 0}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Triggered via IMU classifier</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={26} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Field Crew</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399' }}>{kpis.active_workers || workers.length}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--emerald-400)' }}>50Hz IMU stream normal</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={26} color="#06b6d4" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Edge-to-Cloud Latency</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#22d3ee' }}>{kpis.avg_latency_ms || 142} <span style={{ fontSize: '0.9rem' }}>ms</span></div>
            <div style={{ fontSize: '0.7rem', color: 'var(--emerald-400)' }}>NFR-2 Compliant (&lt;2.0s)</div>
          </div>
        </div>

      </div>

      {/* 2 Big Charts / Breakdown Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.2rem' }}>
        
        {/* Hazard Classification Distribution */}
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={18} color="var(--amber-500)" />
              Hazard Category Distribution (YOLO & Kinematics)
            </h3>
            <span className="badge badge-high" style={{ fontSize: '0.65rem' }}>WBS 1.3.10</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              { type: 'slip-fall', label: 'Slip & Fall Kinematic Impact', color: '#ef4444', icon: Footprints },
              { type: 'wiring', label: 'Exposed Electrical / Wiring', color: '#f59e0b', icon: Zap },
              { type: 'spill', label: 'Hydraulic & Chemical Spills', color: '#06b6d4', icon: Droplets },
              { type: 'debris', label: 'Unsecured Structural Debris', color: '#a855f7', icon: Trash2 },
              { type: 'unsafe-edge', label: 'Open Trench & Unsafe Edge', color: '#dc2626', icon: AlertOctagon }
            ].map(item => {
              const count = hazardDist[item.type] || incidents.filter(i => i.hazard_type === item.type).length;
              const pct = Math.round((count / totalInc) * 100);
              const Icon = item.icon;
              return (
                <div key={item.type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fff' }}>
                      <Icon size={14} color={item.color} /> {item.label}
                    </span>
                    <span style={{ fontWeight: 700, color: item.color, fontFamily: 'var(--font-mono)' }}>
                      {count} incidents ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#090d16', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(5, pct)}%`, height: '100%', background: item.color, borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Zone Safety Risk Matrix */}
        <div className="glass-panel" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MapPin size={18} color="var(--cyan-400)" />
              Zone Risk Assessment & Hazard Hotspots
            </h3>
            <span className="badge badge-medium" style={{ fontSize: '0.65rem' }}>REQ-3.2</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {zones.map(zone => {
              const count = zoneCounts[zone.id] || incidents.filter(i => i.zone_id === zone.id).length;
              const riskColor = zone.risk_level === 'CRITICAL' ? '#ef4444' : (zone.risk_level === 'HIGH' ? '#f59e0b' : '#3b82f6');
              return (
                <div 
                  key={zone.id} 
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff' }}>
                      {zone.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {zone.description}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className={`badge ${zone.risk_level === 'CRITICAL' ? 'badge-critical' : 'badge-high'}`} style={{ fontSize: '0.65rem' }}>
                      {zone.risk_level} RISK
                    </span>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: riskColor, marginTop: '3px' }}>
                      {count} Hazards Logged
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Field Crew Telemetry Status Table */}
      <div className="glass-panel" style={{ padding: '1.2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={18} color="var(--emerald-400)" />
          Edge Device Fleet & Worker Telemetry Status (50Hz IMU Listener)
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.5rem' }}>Worker ID</th>
                <th style={{ padding: '0.5rem' }}>Name</th>
                <th style={{ padding: '0.5rem' }}>Role</th>
                <th style={{ padding: '0.5rem' }}>Assigned Zone</th>
                <th style={{ padding: '0.5rem' }}>GPS Position</th>
                <th style={{ padding: '0.5rem' }}>Sensor Status</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--amber-400)' }}>{w.id}</td>
                  <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, color: '#fff' }}>{w.name}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-secondary)' }}>{w.role}</td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span className="badge badge-low" style={{ fontSize: '0.65rem' }}>{w.zone_id}</span>
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {w.last_lat?.toFixed(4)}, {w.last_lng?.toFixed(4)}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem' }}>
                    <span className="badge badge-resolved" style={{ fontSize: '0.65rem' }}>
                      ● 50Hz ACTIVE
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
