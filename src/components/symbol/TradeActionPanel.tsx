import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, Loader2, ShieldCheck, ClipboardList, Shield } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TradeActionPanelProps {
  symbol: string;
  currentPrice?: number;
  onTradeExecuted?: () => void;
}

interface RuleResult {
  rule: string;
  rule_name: string;
  passed: boolean;
  value: string;
  limit: string;
}

export default function TradeActionPanel({ symbol, currentPrice, onTradeExecuted }: TradeActionPanelProps) {
  const [direction, setDirection] = useState<"LONG" | "SHORT">("LONG");
  const [quantity, setQuantity] = useState(10);
  const [stopLoss, setStopLoss] = useState("");
  const [tp1, setTp1] = useState("");
  const [tp2, setTp2] = useState("");
  const [tp3, setTp3] = useState("");
  const [trailingStopPct, setTrailingStopPct] = useState("3.0");
  const [notes, setNotes] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [isCheckingRules, setIsCheckingRules] = useState(false);
  const [ruleResults, setRuleResults] = useState<{ all_passed: boolean; rules: RuleResult[] } | null>(null);

  // Get latest AI decision for auto-fill
  const latestDecision = useQuery({
    queryKey: ["latest-decision", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trading_decisions")
        .select("*")
        .eq("symbol", symbol)
        .order("decision_timestamp", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Get active position for this symbol
  const activePosition = useQuery({
    queryKey: ["active-position", symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("demo_positions")
        .select("*")
        .eq("symbol", symbol)
        .in("position_status", ["OPEN", "PENDING"])
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Auto-fill from AI decision
  useEffect(() => {
    if (latestDecision.data) {
      const d = latestDecision.data;
      if (d.action_type === "LONG" || d.action_type === "SHORT") {
        setDirection(d.action_type);
      }
      if (d.stop_loss) setStopLoss(String(Number(d.stop_loss).toFixed(2)));
      if (d.take_profit_1) setTp1(String(Number(d.take_profit_1).toFixed(2)));
      if (d.take_profit_2) setTp2(String(Number(d.take_profit_2).toFixed(2)));
      if (d.take_profit_3) setTp3(String(Number(d.take_profit_3).toFixed(2)));
      if (d.trailing_stop_percent) setTrailingStopPct(String(Number(d.trailing_stop_percent).toFixed(1)));
    }
  }, [latestDecision.data]);

  const entryPrice = currentPrice || 0;
  const investAmount = quantity * entryPrice;
  const riskAmount = stopLoss ? Math.abs(entryPrice - Number(stopLoss)) * quantity : 0;
  const riskPct = investAmount > 0 ? (riskAmount / 100000) * 100 : 0;

  const checkRules = async () => {
    setIsCheckingRules(true);
    try {
      const { data, error } = await supabase.rpc("check_trading_rules", {
        p_account_id: 1,
        p_symbol: symbol,
        p_direction: direction,
        p_quantity: quantity,
        p_entry_price: entryPrice,
        p_stop_loss: stopLoss ? Number(stopLoss) : null,
      });
      if (error) throw error;
      setRuleResults(data as any);
    } catch (err: any) {
      toast.error("Regel-Check fehlgeschlagen: " + err.message);
    } finally {
      setIsCheckingRules(false);
    }
  };

  const executeTrade = async () => {
    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-trade-engine", {
        body: {
          action: "open",
          account_id: 1,
          symbol,
          direction,
          quantity,
          entry_price: entryPrice,
          stop_loss: stopLoss ? Number(stopLoss) : null,
          take_profit_1: tp1 ? Number(tp1) : null,
          take_profit_2: tp2 ? Number(tp2) : null,
          take_profit_3: tp3 ? Number(tp3) : null,
          trailing_stop_percent: trailingStopPct ? Number(trailingStopPct) : 3.0,
          trigger_source: "MANUAL",
          decision_id: latestDecision.data?.decision_id || null,
          notes: notes || null,
        },
      });

      if (error) throw error;
      if (data?.status === "OPENED") {
        toast.success(`${direction} Position eröffnet: ${quantity}x ${symbol} @ $${entryPrice.toFixed(2)}`);
        activePosition.refetch();
        onTradeExecuted?.();
      } else {
        toast.error(data?.reason || data?.error || "Trade fehlgeschlagen");
      }
    } catch (err: any) {
      toast.error("Trade-Fehler: " + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const closePosition = async () => {
    if (!activePosition.data) return;
    setIsExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke("demo-trade-engine", {
        body: {
          action: "close",
          position_id: activePosition.data.id,
          exit_price: entryPrice,
          close_reason: "MANUAL",
        },
      });

      if (error) throw error;
      if (data?.status === "CLOSED" || data?.status === "STOPPED_OUT" || data?.status === "TP_HIT") {
        toast.success(
          `Position geschlossen: P&L ${data.pnl_amount >= 0 ? "+" : ""}$${data.pnl_amount} (${data.pnl_percent >= 0 ? "+" : ""}${data.pnl_percent}%)`
        );
        activePosition.refetch();
        onTradeExecuted?.();
      } else {
        toast.error(data?.reason || data?.error || "Schließen fehlgeschlagen");
      }
    } catch (err: any) {
      toast.error("Fehler: " + err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  // Show active position banner
  const pos = activePosition.data;

  return (
    <div className="space-y-4">
      {/* Active Position Banner */}
      {pos && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant={pos.position_type === "LONG" ? "default" : "destructive"} className="text-xs">
                    {pos.position_type === "LONG" ? "🟢 LONG" : "🔴 SHORT"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {Number(pos.quantity)}x @ ${Number(pos.entry_price).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span>Aktuell: ${Number(pos.current_price || entryPrice).toFixed(2)}</span>
                  <span
                    className={cn(
                      "font-semibold",
                      Number(pos.pnl_amount) >= 0 ? "text-green-400" : "text-red-400"
                    )}
                  >
                    P&L: {Number(pos.pnl_amount) >= 0 ? "+" : ""}${Number(pos.pnl_amount || 0).toFixed(2)} (
                    {Number(pos.pnl_percent) >= 0 ? "+" : ""}
                    {Number(pos.pnl_percent || 0).toFixed(2)}%)
                  </span>
                </div>
                {/* Trailing Stop Info */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {pos.stop_loss && (
                    <span>SL: ${Number(pos.stop_loss).toFixed(2)}</span>
                  )}
                  {pos.trailing_stop_price ? (
                    <span className="flex items-center gap-1">
                      <Shield className="h-3 w-3 text-yellow-400" />
                      Trailing: ${Number(pos.trailing_stop_price).toFixed(2)} ({Number(pos.trailing_stop_percent || 3).toFixed(1)}%)
                      {pos.trailing_stop_activated && <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">aktiv</Badge>}
                    </span>
                  ) : pos.trailing_stop_percent ? (
                    <span className="text-muted-foreground/60">
                      Trailing: {Number(pos.trailing_stop_percent).toFixed(1)}% (noch nicht aktiv)
                    </span>
                  ) : null}
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isExecuting}>
                    Schließen
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Position schließen?</AlertDialogTitle>
                    <AlertDialogDescription>
                      {pos.position_type} {Number(pos.quantity)}x {symbol} @ ${Number(pos.entry_price).toFixed(2)}
                      <br />
                      Aktueller Kurs: ${entryPrice.toFixed(2)}
                      <br />
                      Geschätzter P&L:{" "}
                      {pos.position_type === "LONG"
                        ? ((entryPrice - Number(pos.entry_price)) * Number(pos.quantity)).toFixed(2)
                        : ((Number(pos.entry_price) - entryPrice) * Number(pos.quantity)).toFixed(2)}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                    <AlertDialogAction onClick={closePosition}>Ja, schließen</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trade Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Neuer Trade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Direction Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={direction === "LONG" ? "default" : "outline"}
              className={cn(
                direction === "LONG" && "bg-green-600 hover:bg-green-700 text-white"
              )}
              onClick={() => setDirection("LONG")}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              KAUFEN
            </Button>
            <Button
              variant={direction === "SHORT" ? "default" : "outline"}
              className={cn(
                direction === "SHORT" && "bg-red-600 hover:bg-red-700 text-white"
              )}
              onClick={() => setDirection("SHORT")}
            >
              <TrendingDown className="h-4 w-4 mr-1" />
              VERKAUFEN
            </Button>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Menge (Stück)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                -
              </Button>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="h-8 text-center"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Invest: ${investAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Stop Loss & Take Profits */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Stop-Loss</Label>
              <Input
                type="number"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="SL Preis"
                className="h-8 text-sm"
              />
              {stopLoss && entryPrice > 0 && (
                <p className="text-xs text-red-400">
                  {(((Number(stopLoss) - entryPrice) / entryPrice) * 100).toFixed(1)}%
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TP1</Label>
              <Input
                type="number"
                step="0.01"
                value={tp1}
                onChange={(e) => setTp1(e.target.value)}
                placeholder="TP1"
                className="h-8 text-sm"
              />
              {tp1 && entryPrice > 0 && (
                <p className="text-xs text-green-400">
                  +{(((Number(tp1) - entryPrice) / entryPrice) * 100).toFixed(1)}%
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TP2</Label>
              <Input
                type="number"
                step="0.01"
                value={tp2}
                onChange={(e) => setTp2(e.target.value)}
                placeholder="TP2"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">TP3</Label>
              <Input
                type="number"
                step="0.01"
                value={tp3}
                onChange={(e) => setTp3(e.target.value)}
                placeholder="TP3"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Trailing Stop */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Trailing Stop (%)
            </Label>
            <Input
              type="number"
              step="0.5"
              min="1"
              max="10"
              value={trailingStopPct}
              onChange={(e) => setTrailingStopPct(e.target.value)}
              placeholder="3.0"
              className="h-8 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Trailing-Stop aktiviert nach +1% Kursgewinn. Aktuelle Empfehlung:{" "}
              {latestDecision.data?.trailing_stop_percent
                ? `${Number(latestDecision.data.trailing_stop_percent).toFixed(1)}%`
                : "3.0%"}
            </p>
          </div>

          <Separator />

          {/* Risk Summary */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risiko:</span>
              <span className={cn(riskPct > 2 ? "text-red-400 font-semibold" : "text-foreground")}>
                ${riskAmount.toFixed(2)} ({riskPct.toFixed(2)}% vom Konto)
              </span>
            </div>
          </div>

          {/* Rule Check */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={checkRules}
            disabled={isCheckingRules}
          >
            {isCheckingRules ? (
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="h-3 w-3 mr-2" />
            )}
            Regel-Check
          </Button>

          {ruleResults && (
            <div className="space-y-1 rounded-md border p-2">
              {ruleResults.rules?.map((rule: RuleResult, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    {rule.passed ? (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-400" />
                    )}
                    <span className="text-muted-foreground">{rule.rule_name}</span>
                  </div>
                  <span className={rule.passed ? "text-green-400" : "text-red-400"}>
                    {rule.value} / {rule.limit}
                  </span>
                </div>
              ))}
              <div className="pt-1 border-t mt-1">
                <Badge variant={ruleResults.all_passed ? "default" : "destructive"} className="text-xs">
                  {ruleResults.all_passed ? "✅ Alle bestanden" : "❌ Regelverletzung"}
                </Badge>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notizen (Trade Journal)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Warum dieser Trade?"
              className="h-16 text-sm resize-none"
            />
          </div>

          {/* Execute Button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className={cn(
                  "w-full font-semibold",
                  direction === "LONG"
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                )}
                disabled={isExecuting || !entryPrice || (ruleResults && !ruleResults.all_passed)}
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ClipboardList className="h-4 w-4 mr-2" />
                )}
                Position eröffnen: {direction} {quantity}x @ ${entryPrice.toFixed(2)}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Trade bestätigen</AlertDialogTitle>
                <AlertDialogDescription>
                  {direction} {quantity}x {symbol} @ ${entryPrice.toFixed(2)}
                  <br />
                  Investition: ${investAmount.toFixed(2)}
                  {stopLoss && (
                    <>
                      <br />
                      Stop-Loss: ${stopLoss} (Risiko: ${riskAmount.toFixed(2)})
                    </>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={executeTrade}>Trade ausführen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* AI Decision Info */}
          {latestDecision.data && (
            <div className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Letzte AI-Analyse:</p>
              <p>
                {latestDecision.data.action_type} · Konfidenz: {Number(latestDecision.data.confidence_score)}% ·{" "}
                {new Date(latestDecision.data.decision_timestamp).toLocaleString("de-DE")}
              </p>
              {latestDecision.data.trailing_stop_percent && (
                <p className="text-yellow-400/80">
                  Trailing Stop: {Number(latestDecision.data.trailing_stop_percent).toFixed(1)}%
                </p>
              )}
              <p className="mt-1 line-clamp-2">{latestDecision.data.reasoning}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
