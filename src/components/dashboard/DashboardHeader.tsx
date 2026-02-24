import { TrendingUp } from "lucide-react";

export default function DashboardHeader() {
  const today = new Date().toLocaleDateString("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <TrendingUp className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            BörsenStar <span className="text-primary">V4.0</span>
          </h1>
          <p className="text-xs text-muted-foreground">{today}</p>
        </div>
      </div>
    </div>
  );
}
