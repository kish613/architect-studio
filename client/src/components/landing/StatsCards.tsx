import { Box, FileCheck, Sparkles } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  iconColor: string;
  value: string;
  label: string;
  delay?: string;
}

function StatCard({ icon, iconColor, value, label, delay = "0s" }: StatCardProps) {
  return (
    <div
      className="weavy-panel rounded-2xl p-5 text-center floating-animation"
      style={{ animationDelay: delay }}
    >
      <div className={`flex justify-center mb-2 ${iconColor}`}>
        {icon}
      </div>
      <div className="text-2xl font-bold text-white/90 tracking-tight font-[var(--font-poppins)]">
        {value}
      </div>
      <div className="text-xs font-medium text-white/50 uppercase tracking-wide font-[var(--font-poppins)]">
        {label}
      </div>
    </div>
  );
}

export function StatsCards() {
  return (
    <div className="flex justify-center mt-8 relative z-10">
      <div className="grid grid-cols-3 gap-6 max-w-2xl w-full px-4">
        <StatCard
          icon={<Box className="w-8 h-8" />}
          iconColor="text-cyan-600"
          value="50K+"
          label="Blueprints Generated"
          delay="0s"
        />
        <StatCard
          icon={<FileCheck className="w-8 h-8" />}
          iconColor="text-orange-500"
          value="100%"
          label="Planning Compliant"
          delay="1s"
        />
        <StatCard
          icon={<Sparkles className="w-8 h-8" />}
          iconColor="text-emerald-500"
          value="0.5s"
          label="Rendering Time"
          delay="2s"
        />
      </div>
    </div>
  );
}
