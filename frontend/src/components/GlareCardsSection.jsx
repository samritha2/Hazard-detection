import React from "react";
import { GlareCard } from "@/components/ui/glare-card";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldAlert, Activity, Cpu, Sparkles, 
  MapPin, Eye, Zap, Radio 
} from "lucide-react";

export default function GlareCardsSection({ incidents, workers, analytics }) {
  const latestCritical = incidents?.find(i => i.severity === 'CRITICAL') || incidents?.[0];
  const kpis = analytics?.kpis || {};
  const avgLatency = kpis.avg_latency_ms || 142;

  return (
    <div className="w-full flex flex-col gap-4 my-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white tracking-tight">
            HazardSense Holographic Core Sentinels
          </h3>
          <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30">
            Interactive 3D Glare
          </Badge>
        </div>
        <span className="text-xs text-slate-400">
          Hover over cards to view holographic tilt & foil reflection
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center">
        
        {/* Glare Card 1: 50Hz IMU Kinematics */}
        <GlareCard className="flex flex-col justify-between p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950">
          <div>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950">
                <Cpu className="h-5 w-5" />
              </div>
              <Badge variant="default" className="text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-mono">
                FR-1.1 / FR-1.2
              </Badge>
            </div>
            <h4 className="text-lg font-black text-white mt-4 tracking-tight">
              50Hz Kinematic Sentinel
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Sum Vector Magnitude algorithm:
              <span className="block font-mono text-cyan-300 font-bold mt-1 text-[11px]">
                SVM = √(a_x² + a_y² + a_z²)
              </span>
            </p>
          </div>
          
          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Sampling Rate</span>
              <span className="font-mono font-bold text-emerald-400">20ms (50 Hz)</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-slate-400">TFLite Classifier</span>
              <span className="font-mono font-bold text-cyan-400">ACTIVE</span>
            </div>
          </div>
        </GlareCard>

        {/* Glare Card 2: HALVF YOLO11 Vision Pipeline */}
        <GlareCard className="flex flex-col justify-between p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950">
          <div>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-950">
                <Eye className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30 font-mono">
                YOLO11n · 72.5% mAP
              </Badge>
            </div>
            <h4 className="text-lg font-black text-white mt-4 tracking-tight">
              HALVF Vision Pipeline
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Trained on 4,038 site images across 7 classes. Zero-touch camera snap upon impact.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Fall Detection AP@50</span>
              <span className="font-mono font-bold text-rose-400">93.6% (96% Recall)</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-slate-400">Inference Speed</span>
              <span className="font-mono font-bold text-emerald-400">⚡ 2.3ms / frame</span>
            </div>
          </div>
        </GlareCard>

        {/* Glare Card 3: PostGIS Spatial Database */}
        <GlareCard className="flex flex-col justify-between p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950">
          <div>
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-md shadow-rose-950">
                <MapPin className="h-5 w-5" />
              </div>
              <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/30 font-mono">
                FR-3.2 PostGIS
              </Badge>
            </div>
            <h4 className="text-lg font-black text-white mt-4 tracking-tight">
              Geospatial Geofence
            </h4>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              EPSG:4326 spatial queries executing <span className="font-mono text-cyan-300 font-semibold">ST_Contains</span> and <span className="font-mono text-cyan-300 font-semibold">ST_DWithin</span> on high-risk sectors.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Cloud Latency (NFR-2)</span>
              <span className="font-mono font-bold text-cyan-400">⚡ {avgLatency} ms</span>
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-slate-400">Geofence Status</span>
              <span className="font-mono font-bold text-emerald-400">100% GIST INDEXED</span>
            </div>
          </div>
        </GlareCard>

      </div>
    </div>
  );
}
