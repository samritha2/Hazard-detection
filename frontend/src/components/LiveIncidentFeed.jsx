import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, ShieldCheck, Eye, CheckCircle2, Clock, 
  MapPin, User, Zap, Droplets, Trash2, Footprints, AlertOctagon,
  Sparkles, Filter, Search, Activity, ChevronRight
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function LiveIncidentFeed({ incidents, onSelectIncident, onUpdateStatus }) {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const getHazardIcon = (hazardType) => {
    switch (hazardType) {
      case 'slip-fall':
        return <Footprints className="h-5 w-5 text-rose-400" />;
      case 'wiring':
        return <Zap className="h-5 w-5 text-amber-400" />;
      case 'spill':
        return <Droplets className="h-5 w-5 text-cyan-400" />;
      case 'debris':
        return <Trash2 className="h-5 w-5 text-purple-400" />;
      case 'unsafe-edge':
        return <AlertOctagon className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-400" />;
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (filterSeverity !== 'ALL' && inc.severity !== filterSeverity) return false;
    if (filterStatus !== 'ALL' && inc.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchWorker = inc.worker_name?.toLowerCase().includes(q);
      const matchZone = inc.zone_id?.toLowerCase().includes(q);
      const matchHazard = inc.hazard_type?.toLowerCase().includes(q);
      const matchNotes = inc.notes?.toLowerCase().includes(q);
      return matchWorker || matchZone || matchHazard || matchNotes;
    }
    return true;
  });

  return (
    <Card className="h-full flex flex-col overflow-hidden bg-slate-950/80 border-slate-800/80 backdrop-blur-xl shadow-2xl">
      
      {/* Top Header & Search Filter */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <h2 className="text-base font-bold text-white tracking-tight">
              Live Incident Telemetry
            </h2>
            <Badge variant="secondary" className="text-[11px] font-mono px-2 py-0.5">
              {filteredIncidents.length}
            </Badge>
          </div>
          <Badge variant="default" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30">
            REQ-3.1 WEBSOCKET
          </Badge>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(sev => {
            const isSelected = filterSeverity === sev;
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 ${
                  isSelected 
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/30' 
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {sev}
              </button>
            );
          })}
          <div className="w-[1px] h-3.5 bg-slate-800 mx-1" />
          {['ALL', 'NEW', 'RESOLVED'].map(st => {
            const isSelected = filterStatus === st;
            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-150 ${
                  isSelected 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-950/30' 
                    : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
        <AnimatePresence mode="popLayout">
          {filteredIncidents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-14 text-center text-slate-400"
            >
              <ShieldCheck className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-sm font-semibold text-slate-200">All Zones Secure</p>
              <p className="text-xs text-slate-500 mt-1">No hazards matching current filters.</p>
            </motion.div>
          ) : (
            filteredIncidents.map(inc => {
              const isCritical = inc.severity === 'CRITICAL' && inc.status === 'NEW';
              const isHigh = inc.severity === 'HIGH' && inc.status === 'NEW';

              return (
                <motion.div 
                  key={inc.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  onClick={() => onSelectIncident(inc)}
                  className={`group relative rounded-xl p-3.5 cursor-pointer transition-all duration-200 border ${
                    isCritical
                      ? 'bg-rose-950/20 border-rose-500/40 shadow-lg shadow-rose-950/30 hover:border-rose-400'
                      : isHigh
                      ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-400'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  {/* Top Row: Severity + Status + Time */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge 
                        variant={isCritical ? "destructive" : "secondary"} 
                        className={`text-[10px] uppercase font-bold tracking-wider ${
                          isCritical ? "animate-pulse" : ""
                        }`}
                      >
                        {inc.severity}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] ${
                          inc.status === 'RESOLVED' 
                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' 
                            : 'border-slate-700 text-slate-400'
                        }`}
                      >
                        {inc.status}
                      </Badge>
                      {inc.detections && inc.detections.length > 0 && (
                        <Badge variant="default" className="text-[10px] bg-cyan-500/10 text-cyan-400 border-cyan-500/30 gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> YOLO: {inc.detections.length}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock className="h-3 w-3 text-slate-500" />
                      <span>{new Date(inc.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Main Content Details */}
                  <div className="flex gap-3 items-start">
                    <div className="h-10 w-10 rounded-xl bg-slate-800/70 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getHazardIcon(inc.hazard_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold capitalize text-white tracking-tight">
                          {inc.hazard_type?.replace('-', ' ')}
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {inc.id}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 my-1 truncate leading-relaxed">
                        {inc.notes || "Hazard event triggered by edge telemetry."}
                      </p>
                      
                      {/* Meta info chips */}
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-300">
                          <User className="h-3 w-3 text-amber-400" /> {inc.worker_name || inc.worker_id}
                        </span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="h-3 w-3 text-cyan-400" /> {inc.zone_id}
                        </span>
                        {inc.latency_ms && (
                          <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                            ⚡ {inc.latency_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Row */}
                  <div className="flex justify-end gap-2 mt-3 pt-2.5 border-t border-slate-800/50">
                    <Button 
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectIncident(inc);
                      }}
                      className="text-xs h-7 gap-1"
                    >
                      <Eye className="h-3 w-3" /> Inspect
                    </Button>
                    {inc.status !== 'RESOLVED' && (
                      <Button 
                        variant="default"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateStatus(inc.id, 'RESOLVED');
                        }}
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-500 text-white gap-1 shadow-sm shadow-emerald-950"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Resolve
                      </Button>
                    )}
                  </div>

                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

    </Card>
  );
}
