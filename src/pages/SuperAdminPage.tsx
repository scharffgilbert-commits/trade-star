import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  Settings,
  Activity,
  Server,
  Check,
  X,
  Shield,
  UserCheck,
  Clock,
} from "lucide-react";

// ━━━ Tab Navigation ━━━
const tabs = [
  { id: "users", label: "Userverwaltung", icon: Users },
  { id: "strategy", label: "Strategy Config", icon: Settings },
  { id: "pipeline", label: "Pipeline Monitor", icon: Activity },
  { id: "health", label: "System Health", icon: Server },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<TabId>("users");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-gold" />
        <h1 className="text-xl font-bold">SuperAdmin</h1>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden md:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "users" && <UserManagementTab />}
      {activeTab === "strategy" && <StrategyConfigTab />}
      {activeTab === "pipeline" && <PipelineMonitorTab />}
      {activeTab === "health" && <SystemHealthTab />}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 1: USERVERWALTUNG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function UserManagementTab() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["admin-user-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({
      userId,
      approved,
    }: {
      userId: string;
      approved: boolean;
    }) => {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          is_approved: approved,
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: approved ? currentUser?.id : null,
        })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-user-profiles"] }),
  });

  const roleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string;
      role: string;
    }) => {
      const { error } = await supabase
        .from("user_profiles")
        .update({ role })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-user-profiles"] }),
  });

  const pendingCount = profiles.filter((p: any) => !p.is_approved).length;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Lade User...</div>;
  }

  return (
    <div className="space-y-4">
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-amber-500">
            {pendingCount} User warten auf Freischaltung
          </span>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border">
              <th className="text-left px-4 py-2 font-medium">Email</th>
              <th className="text-left px-4 py-2 font-medium">Rolle</th>
              <th className="text-left px-4 py-2 font-medium">Status</th>
              <th className="text-left px-4 py-2 font-medium">Registriert</th>
              <th className="text-right px-4 py-2 font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile: any) => (
              <tr
                key={profile.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {profile.role === "superadmin" && (
                      <Shield className="h-3.5 w-3.5 text-gold" />
                    )}
                    <span className="font-mono text-xs">{profile.email}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={profile.role}
                    onChange={(e) =>
                      roleMutation.mutate({
                        userId: profile.id,
                        role: e.target.value,
                      })
                    }
                    disabled={profile.id === currentUser?.id}
                    className="bg-transparent border border-border rounded px-2 py-1 text-xs disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="superadmin">SuperAdmin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  {profile.is_approved ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-bullish/15 text-bullish">
                      <UserCheck className="h-3 w-3" />
                      Freigeschaltet
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                      <Clock className="h-3 w-3" />
                      Wartend
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(profile.created_at).toLocaleDateString("de-DE", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-3 text-right">
                  {profile.id !== currentUser?.id && (
                    <div className="flex items-center justify-end gap-1">
                      {!profile.is_approved ? (
                        <button
                          onClick={() =>
                            approveMutation.mutate({
                              userId: profile.id,
                              approved: true,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-bullish/15 text-bullish hover:bg-bullish/25 transition-colors"
                        >
                          <Check className="h-3 w-3" />
                          Freischalten
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            approveMutation.mutate({
                              userId: profile.id,
                              approved: false,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-bearish/15 text-bearish hover:bg-bearish/25 transition-colors"
                        >
                          <X className="h-3 w-3" />
                          Sperren
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 2: STRATEGY CONFIG
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function StrategyConfigTab() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ["admin-strategy-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("strategy_config")
        .select("*")
        .order("config_key");
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: string }) => {
      let parsedValue: any;
      try {
        parsedValue = JSON.parse(value);
      } catch {
        parsedValue = { value };
      }
      const { error } = await supabase
        .from("strategy_config")
        .update({ config_value: parsedValue })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-strategy-config"] });
      setEditingId(null);
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Lade Config...</div>;
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="text-left px-4 py-2 font-medium">Key</th>
            <th className="text-left px-4 py-2 font-medium">Wert</th>
            <th className="text-left px-4 py-2 font-medium">Beschreibung</th>
            <th className="text-right px-4 py-2 font-medium">Aktion</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config: any) => (
            <tr
              key={config.id}
              className="border-b border-border last:border-0 hover:bg-muted/20"
            >
              <td className="px-4 py-3 font-mono text-xs text-primary">
                {config.config_key}
              </td>
              <td className="px-4 py-3">
                {editingId === config.id ? (
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full bg-background border border-border rounded px-2 py-1 text-xs font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        updateMutation.mutate({
                          id: config.id,
                          value: editValue,
                        });
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                ) : (
                  <span className="font-mono text-xs">
                    {JSON.stringify(config.config_value)}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                {config.description}
              </td>
              <td className="px-4 py-3 text-right">
                {editingId === config.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() =>
                        updateMutation.mutate({
                          id: config.id,
                          value: editValue,
                        })
                      }
                      className="px-2 py-1 text-xs rounded bg-bullish/15 text-bullish hover:bg-bullish/25"
                    >
                      Speichern
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80"
                    >
                      Abbruch
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingId(config.id);
                      setEditValue(JSON.stringify(config.config_value));
                    }}
                    className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    Bearbeiten
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 3: PIPELINE MONITOR
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function PipelineMonitorTab() {
  const today = new Date().toISOString().slice(0, 10);

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["admin-pipeline-status", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_pipeline_status")
        .select("*")
        .eq("run_date", today)
        .order("step_order");
      if (error) throw error;
      return data;
    },
    refetchInterval: 10000,
  });

  const statusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-bullish/15 text-bullish";
      case "running":
        return "bg-primary/15 text-primary animate-pulse";
      case "failed":
        return "bg-bearish/15 text-bearish";
      case "skipped":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted/50 text-muted-foreground";
    }
  };

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Lade Pipeline...</div>;
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Keine Pipeline für heute ({today}) initialisiert.</p>
        <p className="text-xs mt-1">Pipeline startet um 21:10 UTC (Mo-Fr).</p>
      </div>
    );
  }

  const completed = steps.filter((s: any) => s.status === "completed").length;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-mono text-muted-foreground">
          {completed}/{steps.length}
        </span>
      </div>

      {/* Step Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {steps.map((step: any) => (
          <div
            key={step.id}
            className={`rounded-lg border border-border p-3 ${
              step.status === "running" ? "border-primary/50" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-muted-foreground">
                #{step.step_order}
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor(
                  step.status
                )}`}
              >
                {step.status}
              </span>
            </div>
            <p className="text-xs font-medium truncate">{step.step_name}</p>
            {step.symbols_completed != null && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {step.symbols_completed}/{step.symbols_total ?? "?"} Symbole
                {step.symbols_failed > 0 && (
                  <span className="text-bearish ml-1">
                    ({step.symbols_failed} Fehler)
                  </span>
                )}
              </p>
            )}
            {step.completed_at && (
              <p className="text-[10px] text-muted-foreground">
                {new Date(step.completed_at).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TAB 4: SYSTEM HEALTH
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SystemHealthTab() {
  const { data: edgeFunctionStats } = useQuery({
    queryKey: ["admin-edge-function-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_system_health_stats");
      if (error) {
        // Fallback: manuelle Abfrage
        const today = new Date().toISOString().slice(0, 10);

        const { count: posCount } = await supabase
          .from("demo_positions")
          .select("*", { count: "exact", head: true })
          .eq("position_status", "OPEN");

        const { count: symbolCount } = await supabase
          .from("symbols_master")
          .select("*", { count: "exact", head: true })
          .eq("active", true);

        const { count: decisionCount } = await supabase
          .from("trading_decisions")
          .select("*", { count: "exact", head: true })
          .gte("decision_timestamp", today + "T00:00:00");

        const { count: userCount } = await supabase
          .from("user_profiles")
          .select("*", { count: "exact", head: true });

        return {
          open_positions: posCount ?? 0,
          active_symbols: symbolCount ?? 0,
          decisions_today: decisionCount ?? 0,
          total_users: userCount ?? 0,
        };
      }
      return data;
    },
    refetchInterval: 30000,
  });

  const stats = edgeFunctionStats ?? {
    open_positions: 0,
    active_symbols: 0,
    decisions_today: 0,
    total_users: 0,
  };

  const cards = [
    { label: "Offene Positionen", value: stats.open_positions, color: "text-primary" },
    { label: "Aktive Symbole", value: stats.active_symbols, color: "text-bullish" },
    { label: "Decisions heute", value: stats.decisions_today, color: "text-gold" },
    { label: "Registrierte User", value: stats.total_users, color: "text-foreground" },
  ];

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-card border border-border rounded-lg p-4"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={`text-2xl font-bold font-mono ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Cron Jobs Info */}
      <div className="bg-card border border-border rounded-lg p-4">
        <h3 className="text-sm font-medium mb-3">Aktive Cron Jobs</h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Daily Pipeline Init</span>
            <span>21:10 UTC Mo-Fr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pipeline Advance</span>
            <span>*/2 21-23 UTC Mo-Fr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Intraday Prices</span>
            <span>*/15 8-20 UTC Mo-Fr</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">V7 Weekly Review</span>
            <span>18:00 UTC Sonntag</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">V7 Monthly Review</span>
            <span>17:00 UTC am 1.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
