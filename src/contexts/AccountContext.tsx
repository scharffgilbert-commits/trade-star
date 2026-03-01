import React, { createContext, useContext, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface AccountInfo {
  id: number;
  label: string;
  description: string;
  color: string;
  isReadOnly: boolean;
}

const ACCOUNTS: Record<number, AccountInfo> = {
  1: {
    id: 1,
    label: "Live Demo",
    description: "Aktives Demo-Depot",
    color: "hsl(142, 76%, 36%)", // green
    isReadOnly: false,
  },
  2: {
    id: 2,
    label: "Backtest 2025",
    description: "Historischer Backtest ab 01/2025",
    color: "hsl(217, 91%, 60%)", // blue
    isReadOnly: true,
  },
};

interface AccountContextValue {
  accountId: number;
  accountInfo: AccountInfo;
  accounts: typeof ACCOUNTS;
  setAccountId: (id: number) => void;
  isBacktest: boolean;
  isReadOnly: boolean;
}

const AccountContext = createContext<AccountContextValue | null>(null);

function getInitialAccountId(): number {
  try {
    const stored = localStorage.getItem("boersenstar-account-id");
    if (stored) {
      const id = parseInt(stored, 10);
      if (ACCOUNTS[id]) return id;
    }
  } catch {
    // localStorage not available
  }
  return 1;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountIdState] = useState<number>(getInitialAccountId);
  const queryClient = useQueryClient();

  const setAccountId = useCallback(
    (id: number) => {
      if (!ACCOUNTS[id]) return;
      setAccountIdState(id);
      try {
        localStorage.setItem("boersenstar-account-id", String(id));
      } catch {
        // ignore
      }
      // Invalidate all account-dependent queries
      queryClient.invalidateQueries({ queryKey: ["demo-account"] });
      queryClient.invalidateQueries({ queryKey: ["demo-account-strip"] });
      queryClient.invalidateQueries({ queryKey: ["balance-snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["open-positions"] });
      queryClient.invalidateQueries({ queryKey: ["open-positions-count"] });
      queryClient.invalidateQueries({ queryKey: ["closed-positions"] });
      queryClient.invalidateQueries({ queryKey: ["pnl-by-symbol"] });
      queryClient.invalidateQueries({ queryKey: ["trading-rules"] });
      queryClient.invalidateQueries({ queryKey: ["auto-trade-config"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-returns"] });
      queryClient.invalidateQueries({ queryKey: ["setup-performance"] });
      queryClient.invalidateQueries({ queryKey: ["exit-reason-analysis"] });
    },
    [queryClient]
  );

  const accountInfo = ACCOUNTS[accountId] ?? ACCOUNTS[1];

  return (
    <AccountContext.Provider
      value={{
        accountId,
        accountInfo,
        accounts: ACCOUNTS,
        setAccountId,
        isBacktest: accountId === 2,
        isReadOnly: accountInfo.isReadOnly,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccountContext(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccountContext must be used within an AccountProvider");
  }
  return context;
}

export { ACCOUNTS };
export type { AccountInfo };
