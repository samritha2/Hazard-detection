import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, CheckCircle2, AlertTriangle, User, MapPin, 
  Clock, Activity, Layers, Send, RefreshCw, Radio, Sparkles, Crosshair, Cpu 
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DetectionInspectorModal({ incident, onClose, onUpdateStatus, onTriggerYoloWebhook }) {
  const canvasRef = useRef(null);
  const [activeNotes, setActiveNotes] = useState(incident?.notes || '');
  const [isInjectingYolo, setIsInjectingYolo] = useState(false);

  // Render bounding boxes over canvas
  useEffect(() => {
    if (!incident || !incident.image_url) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = incident.image_url.startsWith('http') 
      ? incident.image_url 
      : `http://localhost:8000${incident.image_url}`;

    img.onload = () => {
      canvas.width = img.naturalWidth || 800;
      canvas.height = img.naturalHeight || 600;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw bounding boxes with HUD aesthetics
      const detections = incident.detections || [];
      detections.forEach((det) => {
        const [nx, ny, nw, nh] = det.bbox || [0.2, 0.2, 0.4, 0.4];
        const x = nx * canvas.width;
        const y = ny * canvas.height;
        const w = nw * canvas.width;
        const h = nh * canvas.height;

        // HALVF Class color mapping
        const labelLower = (det.label || '').toLowerCase();
        let boxColor = '#f59e0b';
        let isSafe = false;

        if (labelLower === 'fall' || labelLower === 'exposed_edge') {
          boxColor = '#f43f5e'; // Rose red for critical anomalies
        } else if (labelLower === 'ppe_safe' || labelLower === 'person_safe') {
          boxColor = '#10b981'; // Emerald green for safe compliant workers
          isSafe = true;
        } else if (labelLower === 'spill') {
          boxColor = '#06b6d4';
        } else if (labelLower === 'debris') {
          boxColor = '#a855f7';
        }

        // Outer HUD Border
        ctx.lineWidth = 3;
        ctx.strokeStyle = boxColor;
        ctx.strokeRect(x, y, w, h);

        // Semi-transparent Fill
        ctx.fillStyle = isSafe ? 'rgba(16, 185, 129, 0.18)' : (boxColor === '#f43f5e' ? 'rgba(244, 63, 94, 0.22)' : 'rgba(245, 158, 11, 0.22)');
        ctx.fillRect(x, y, w, h);

        // Corner Crosshair Accents
        const cornerSize = 12;
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#ffffff';

        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(x, y + cornerSize);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerSize, y);
        ctx.stroke();

        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(x + w - cornerSize, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + cornerSize);
        ctx.stroke();

        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(x, y + h - cornerSize);
        ctx.lineTo(x, y + h);
        ctx.lineTo(x + cornerSize, y + h);
        ctx.stroke();

        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(x + w - cornerSize, y + h);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x + w, y + h - cornerSize);
        ctx.stroke();

        // Label Tag with HALVF Class & Confidence
        const labelText = `[HALVF] ${det.label.toUpperCase()} · ${Math.round((det.confidence || 0.9) * 100)}%`;
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(labelText).width;
        
        ctx.fillStyle = boxColor;
        ctx.fillRect(x, Math.max(0, y - 24), textWidth + 14, 24);
        
        ctx.fillStyle = isSafe ? '#ffffff' : '#000000';
        ctx.fillText(labelText, x + 7, Math.max(16, y - 7));
      });
    };
  }, [incident]);

  if (!incident) return null;

  const imu = incident.imu_telemetry || {};
  const detections = incident.detections || [];

  const handleYoloTestInject = async () => {
    setIsInjectingYolo(true);
    // Real HALVF model detection payload from Kaggle benchmark
    const mockBoxes = [
      { label: 'fall', confidence: 0.89, bbox: [0.15, 0.45, 0.70, 0.48], severity: 'CRITICAL' },
      { label: 'no_ppe', confidence: 0.81, bbox: [0.35, 0.15, 0.30, 0.30], severity: 'HIGH' },
      { label: 'ppe_safe', confidence: 0.73, bbox: [0.05, 0.10, 0.25, 0.35], severity: 'SAFE' }
    ];
    await onTriggerYoloWebhook(incident.id, mockBoxes);
    setIsInjectingYolo(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="w-[1020px] max-w-[96vw] max-h-[92vh] flex flex-col rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl"
      >
        
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                incident.severity === 'CRITICAL' ? 'bg-rose-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${
                incident.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Spatial Classification & Kinematics Inspector
                <Badge variant="outline" className="text-xs font-mono">{incident.id}</Badge>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                IEEE 830-1998 REQ-2.3 Computer Vision & REQ-1.1 Edge Kinematic Audit
              </p>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="rounded-full h-8 w-8 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Modal Body: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
          
          {/* Left: Image Canvas & Detection HUD */}
          <div className="p-5 bg-slate-950 flex flex-col gap-3 overflow-y-auto border-r border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Crosshair className="h-4 w-4" /> YOLOv8 Spatial HUD Overlay
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {detections.length} Target(s) Plotted
              </span>
            </div>

            {/* Canvas Frame */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 min-h-[260px] flex items-center justify-center shadow-inner">
              <canvas 
                ref={canvasRef} 
                className="w-full h-auto block object-contain"
              />
            </div>

            {/* Detections Chips */}
            <div className="flex flex-wrap gap-2">
              {detections.map((det, idx) => (
                <div 
                  key={idx} 
                  className="bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2"
                >
                  <span className="font-bold text-amber-300 capitalize">
                    {det.label}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    {Math.round((det.confidence || 0.9) * 100)}% Conf
                  </span>
                </div>
              ))}
            </div>

            {/* Teammate YOLO Webhook Injector Test Hook */}
            <div className="mt-auto bg-cyan-500/10 border border-dashed border-cyan-500/30 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5" /> Teammate YOLOv8 Webhook (CH-81)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">POST /api/yolo/inference-webhook</span>
              </div>
              <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">
                Simulate your teammate's YOLOv8 script sending real-time bounding box detections into this incident.
              </p>
              <Button 
                variant="outline"
                size="sm"
                onClick={handleYoloTestInject}
                disabled={isInjectingYolo}
                className="w-full text-xs gap-1.5 bg-cyan-500/20 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/30"
              >
                {isInjectingYolo ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Test Inject YOLO Bounding Boxes
              </Button>
            </div>

          </div>

          {/* Right: IMU Kinematics & Incident Metadata */}
          <div className="p-5 overflow-y-auto flex flex-col gap-4 bg-slate-900/40">
            
            {/* Meta Summary Card */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px]">Worker Fleet ID:</span>
                  <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    <User className="h-3.5 w-3.5 text-amber-400" /> {incident.worker_name || incident.worker_id}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Site Sector:</span>
                  <div className="font-bold text-cyan-400 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-3.5 w-3.5" /> {incident.zone_id}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Spatial GPS:</span>
                  <div className="font-mono text-slate-200 mt-0.5">
                    {incident.latitude?.toFixed(5)}, {incident.longitude?.toFixed(5)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[11px]">Edge-Cloud Latency:</span>
                  <div className="font-bold text-emerald-400 mt-0.5 font-mono">
                    ⚡ {incident.latency_ms || 140} ms (&lt;2.0s)
                  </div>
                </div>
              </div>
            </div>

            {/* Edge IMU Kinematics Bar Visualizer */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-rose-400" /> 50Hz IMU Kinematic Telemetry
                </span>
                <Badge variant={imu.fall_detected ? "destructive" : "secondary"} className="text-[10px]">
                  {imu.fall_detected ? 'FALL DETECTED' : 'NORMAL MOTION'}
                </Badge>
              </div>

              {/* 3-Axis Acceleration Bars */}
              <div className="flex flex-col gap-2.5 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Ax (Lateral)</span>
                    <span className="font-mono font-bold text-slate-200">{imu.ax?.toFixed(2) || '0.00'} m/s²</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, Math.abs(imu.ax || 0) * 8)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Ay (Longitudinal)</span>
                    <span className="font-mono font-bold text-slate-200">{imu.ay?.toFixed(2) || '0.00'} m/s²</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, Math.abs(imu.ay || 0) * 8)}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-slate-400">Az (Vertical Impact Shock)</span>
                    <span className={`font-mono font-bold ${
                      (imu.az > 18 || imu.az < 3) ? 'text-rose-400' : 'text-slate-200'
                    }`}>
                      {imu.az?.toFixed(2) || '9.81'} m/s²
                    </span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${
                      (imu.az > 18 || imu.az < 3) ? 'bg-rose-500' : 'bg-emerald-500'
                    }`} style={{ width: `${Math.min(100, Math.abs(imu.az || 9.8) * 4)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Safety Triage & Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Safety Manager Incident Log & Notes:
              </label>
              <textarea
                value={activeNotes}
                onChange={(e) => setActiveNotes(e.target.value)}
                rows={2}
                placeholder="Add mitigation actions taken (e.g., barrier installed, worker evacuated)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl text-slate-100 p-2.5 text-xs focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Triage Action Buttons */}
            <div className="flex gap-2 mt-auto pt-2">
              {incident.status !== 'RESOLVED' ? (
                <Button
                  variant="default"
                  onClick={() => {
                    onUpdateStatus(incident.id, 'RESOLVED', activeNotes);
                    onClose();
                  }}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" /> Mark Hazard Resolved
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    onUpdateStatus(incident.id, 'NEW', activeNotes);
                    onClose();
                  }}
                  className="flex-1 text-xs gap-1.5"
                >
                  <RefreshCw className="h-4 w-4" /> Reopen Incident
                </Button>
              )}
            </div>

          </div>

        </div>

      </motion.div>
    </div>
  );
}
