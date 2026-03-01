import { useAccountContext, ACCOUNTS } from "@/contexts/AccountContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlaskConical, Radio } from "lucide-react";

interface AccountSwitcherProps {
  compact?: boolean;
}

export default function AccountSwitcher({ compact = false }: AccountSwitcherProps) {
  const { accountId, setAccountId } = useAccountContext();

  if (compact) {
    return (
      <Select
        value={String(accountId)}
        onValueChange={(v) => setAccountId(Number(v))}
      >
        <SelectTrigger className="h-8 w-full text-xs border-sidebar-border bg-sidebar hover:bg-sidebar-accent">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(ACCOUNTS).map((acc) => (
            <SelectItem key={acc.id} value={String(acc.id)} className="text-xs">
              <span className="flex items-center gap-2">
                {acc.id === 1 ? (
                  <Radio className="h-3 w-3 text-emerald-500" />
                ) : (
                  <FlaskConical className="h-3 w-3 text-blue-500" />
                )}
                <span>{acc.label}</span>
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
      <SelectTrigger className="h-9 w-[220px] text-sm">
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
              <span className="font-medium">{acc.label}</span>
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
