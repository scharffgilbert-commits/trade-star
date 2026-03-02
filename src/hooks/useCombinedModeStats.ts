import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface CombinedModeConfig {
  useCombinedMode: boolean;
  minScoreLong: number;
  minScoreShort: number;
}

interface RecentFilter {
  symbol: string;
  direction: string;
  v7Score: number | null;
  passed: boolean;
  date: string;
}

interface CombinedModeStats {
  config: CombinedModeConfig;
  longPassed: number;
  longBlocked: number;
  shortPassed: number;
  shortBlocked: number;
  totalPassed: number;
  totalBlocked: number;
  recentFilters: RecentFilter[];
  isLoading: boolean;
}

export function useCombinedModeStats(): CombinedModeStats {
  const { data, isLoading } = useQuery({
    queryKey: ["combined-mode-stats"],
    queryFn: async () => {
      // Query recent trading decisions that have v7 metadata
      const { data: decisions, error } = await (supabase as any)
        .from("trading_decisions")
        .select("symbol, direction, created_at, metadata")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        // Table might not exist yet — return defaults
        return {
          config: { useCombinedMode: false, minScoreLong: 5, minScoreShort: 5 },
          longPassed: 0,
          longBlocked: 0,
          shortPassed: 0,
          shortBlocked: 0,
          recentFilters: [] as RecentFilter[],
        };
      }

      // Parse V7 combined mode config from most recent decision metadata
      let config: CombinedModeConfig = {
        useCombinedMode: false,
        minScoreLong: 5,
        minScoreShort: 5,
      };

      let longPassed = 0;
      let longBlocked = 0;
      let shortPassed = 0;
      let shortBlocked = 0;
      const recentFilters: RecentFilter[] = [];

      for (const d of (decisions ?? [])) {
        const meta = d.metadata as any;
        if (!meta) continue;

        if (meta.v7_combined_mode !== undefined && !config.useCombinedMode) {
          config = {
            useCombinedMode: !!meta.v7_combined_mode,
            minScoreLong: meta.v7_min_score_long ?? 5,
            minScoreShort: meta.v7_min_score_short ?? 5,
          };
        }

        const v7Score = meta.v7_composite_score ?? null;
        const isLong = d.direction === "LONG";
        const threshold = isLong ? config.minScoreLong : config.minScoreShort;
        const passed = v7Score !== null && v7Score >= threshold;

        if (isLong) {
          if (passed) longPassed++;
          else longBlocked++;
        } else {
          if (passed) shortPassed++;
          else shortBlocked++;
        }

        recentFilters.push({
          symbol: d.symbol,
          direction: d.direction,
          v7Score,
          passed,
          date: d.created_at,
        });
      }

      return { config, longPassed, longBlocked, shortPassed, shortBlocked, recentFilters };
    },
    staleTime: 120000,
  });

  return {
    config: data?.config ?? { useCombinedMode: false, minScoreLong: 5, minScoreShort: 5 },
    longPassed: data?.longPassed ?? 0,
    longBlocked: data?.longBlocked ?? 0,
    shortPassed: data?.shortPassed ?? 0,
    shortBlocked: data?.shortBlocked ?? 0,
    totalPassed: (data?.longPassed ?? 0) + (data?.shortPassed ?? 0),
    totalBlocked: (data?.longBlocked ?? 0) + (data?.shortBlocked ?? 0),
    recentFilters: data?.recentFilters ?? [],
    isLoading,
  };
}
