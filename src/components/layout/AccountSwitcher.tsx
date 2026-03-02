import { useAccountContext, ACCOUNTS } from "@/contexts/AccountContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlaskConical, Radio, Crown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountSwitcherProps {
  compact?: boolean;
}

function AccountIcon({ id, className }: { id: number; className?: string }) {
  if (id === 1) return <Radio className={cn("text-bullish", className)} />;
  if (id === 4) return <Crown className={cn("text-gold", className)} />;
  return <FlaskConical className={cn("text-primary", className)} />;
}

export default function AccountSwitcher({ compact = false }: AccountSwitcherProps) {
  const { accountId, setAccountId } = useAccountContext();
  const isGold = accountId === 4;

  if (compact) {
    return (
      <Select
        value={String(accountId)}
        onValueChange={(v) => setAccountId(Number(v))}
      >
        <SelectTrigger
          className={cn(
            "h-8 w-full text-xs border-sidebar-border bg-sidebar hover:bg-sidebar-accent",
            isGold && "ring-2 ring-gold/50"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(ACCOUNTS).map((acc) => (
            <SelectItem key={acc.id} value={String(acc.id)} className="text-xs">
              <span className="flex items-center gap-2">
                <AccountIcon id={acc.id} className="h-3 w-3" />
                <span className={acc.id === 4 ? "text-gold" : ""}>{acc.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select
      value={String(accountId)}
      onValueChange={(v) => setAccountId(Number(v))}
    >
      <SelectTrigger
        className={cn(
          "h-9 w-[220px] text-sm",
          isGold && "ring-2 ring-gold/50"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(ACCOUNTS).map((acc) => (
          <SelectItem key={acc.id} value={String(acc.id)}>
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: acc.color }}
              />
              <span className={cn("font-medium", acc.id === 4 && "text-gold")}>{acc.label}</span>
              <span className="text-muted-foreground text-xs">
                {acc.description}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
