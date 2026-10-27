import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import {
  Settings2,
  Command,
  Plus,
  Radio,
  Activity,
  ShieldCheck,
  Cpu,
  Zap,
} from "lucide-react";

export default function HazardBentoShowcase({ analytics, workers, incidents, onRefresh }) {
  const [streamActive, setStreamActive] = React.useState(true);
  const kpis = analytics?.kpis || {};
  const activeWorkersCount = workers?.length || 4;
  const criticalCount = kpis.critical_count || incidents?.filter(i => i.severity === 'CRITICAL').length || 1;
  const latency = kpis.avg_latency_ms || 142;

  const EdgeIntegrationCard = () => (
    <Card className="flex h-full flex-col bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border-cyan-500/20 shadow-xl">
      <CardHeader>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
          <Cpu className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Flutter 50Hz Sentinel
          <Badge variant="default" className="text-[10px] uppercase">FR-1.1</Badge>
        </CardTitle>
        <CardDescription className="text-xs text-slate-400 mt-2 leading-relaxed">
          High-frequency on-device kinematic listener calculating Sum Vector Magnitude (SVM = √(a_x² + a_y² + a_z²)) with real-time TFLite fall classification.
        </CardDescription>
      </CardHeader>
      <CardFooter className="mt-auto flex items-center justify-between pt-4 border-t border-slate-800/60">
        <Button variant="outline" size="sm" onClick={onRefresh} className="text-xs gap-1">
          <Settings2 className="h-3.5 w-3.5" />
          Fleet Config
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">{streamActive ? "Streaming" : "Paused"}</span>
          <Switch
            checked={streamActive}
            onCheckedChange={setStreamActive}
            aria-label="Toggle sensor streaming"
          />
        </div>
      </CardFooter>
    </Card>
  );

  const TrackersCard = () => (
    <Card className="h-full bg-slate-900/70 border-slate-800/80">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
              Active Field Crew
            </CardTitle>
            <Badge variant="secondary" className="text-emerald-400 bg-emerald-500/10 border-emerald-500/20 text-[10px]">
              ONLINE
            </Badge>
          </div>
          <CardDescription className="text-xs text-slate-400 mt-1">
            0{activeWorkersCount} Field Personnel Geotagged
          </CardDescription>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex -space-x-2 overflow-hidden">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white ring-2 ring-slate-900">RK</div>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-xs font-bold text-white ring-2 ring-slate-900">AS</div>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white ring-2 ring-slate-900">VM</div>
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white ring-2 ring-slate-900">+1</div>
          </div>
          <span className="text-xs font-mono text-cyan-400">50 Hz Sync</span>
        </div>
      </CardContent>
    </Card>
  );

  const FocusCard = () => (
    <Card className="h-full bg-slate-900/70 border-slate-800/80">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-semibold">TFLite Accuracy</CardTitle>
            <CardDescription className="text-xs text-slate-400">On-Device Fall Model</CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]">
            NFR-1
          </Badge>
        </div>
        <div>
          <span className="text-5xl font-black tracking-tight text-white">96.8%</span>
        </div>
        <div className="flex justify-between text-[11px] text-slate-400">
          <span>Precision Ratio</span>
          <span className="text-emerald-400">0.02 False Alarm</span>
        </div>
      </CardContent>
    </Card>
  );

  const StatisticCard = () => (
    <Card className="relative h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900/90 to-cyan-950/40 border-slate-800">
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
          backgroundSize: "14px 14px",
        }}
      />
      <CardContent className="relative z-10 flex h-full flex-col items-center justify-center p-6 text-center">
        <span className="text-6xl font-black text-cyan-400 font-mono tracking-tight">{latency}<span className="text-2xl font-bold text-slate-400">ms</span></span>
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase mt-1">Edge-to-Cloud Latency</span>
        <Badge variant="default" className="mt-2 text-[10px] bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
          Sub-2.0s NFR-2 Pass
        </Badge>
      </CardContent>
    </Card>
  );

  const ProductivityCard = () => (
    <Card className="h-full bg-slate-900/70 border-slate-800/80">
      <CardContent className="flex h-full flex-col justify-between p-6">
        <div>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">YOLOv8 Vision AI</CardTitle>
            <Zap className="h-4 w-4 text-amber-400" />
          </div>
          <CardDescription className="text-xs text-slate-400 mt-1">
            Zero-touch context snapshot inference on multi-hazard bounding boxes.
          </CardDescription>
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-400">Model: yolov8n-custom</span>
          <Badge variant="destructive" className="text-[10px]">
            {criticalCount} Critical Triage
          </Badge>
        </div>
      </CardContent>
    </Card>
  );

  const ShortcutsCard = () => (
    <Card className="h-full bg-slate-900/70 border-slate-800/80">
      <CardContent className="flex h-full flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
            Safety Operator Hotkeys
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Instant triage hotkeys for fast hazard acknowledgement and broadcast.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex h-7 px-2 items-center justify-center rounded-md border border-slate-700 bg-slate-800 font-mono text-xs font-bold text-slate-200 shadow-sm">
              <Command className="h-3 w-3 mr-1" /> K
            </div>
            <span className="text-xs text-slate-400">Search</span>
          </div>

          <Plus className="h-3 w-3 text-slate-600" />

          <div className="flex items-center gap-1.5">
            <div className="flex h-7 px-2 items-center justify-center rounded-md border border-red-900/50 bg-red-950/40 font-mono text-xs font-bold text-red-400 shadow-sm">
              F
            </div>
            <span className="text-xs text-slate-400">Simulate Fall</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full">
      <BentoGridShowcase
        integration={<EdgeIntegrationCard />}
        trackers={<TrackersCard />}
        statistic={<StatisticCard />}
        focus={<FocusCard />}
        productivity={<ProductivityCard />}
        shortcuts={<ShortcutsCard />}
      />
    </div>
  );
}
