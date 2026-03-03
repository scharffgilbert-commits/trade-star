import React, { createContext, useContext, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface AccountInfo {
  id: number;
  label: string;
  description: string;
  color: string;
  isReadOnly: boolean;
  isCFD?: boolean;
  currency?: string;
}

const ACCOUNTS: Record<number, AccountInfo> = {
  1: {
    id: 1,
    label: "Live Demo",
    description: "Aktives Demo-Depot",
    color: "hsl(142, 76%, 36%)",
    isReadOnly: false,
  },
  2: {
    id: 2,
    label: "V6 Backtest",
    description: "Historischer Backtest V6",
    color: "hsl(217, 91%, 60%)",
    isReadOnly: true,
  },
  3: {
    id: 3,
    label: "V7 Backtest",
    description: "Historischer Backtest V7",
    color: "hsl(270, 60%, 60%)",
    isReadOnly: true,
  },
  4: {
    id: 4,
    label: "Combined V8",
    description: "V8 Gold Combined",
    color: "hsl(48, 100%, 50%)",
    isReadOnly: true,
  },
  5: {
    id: 5,
    label: "IG Markets CFD",
    description: "CFD Simulation 20x Hebel, 5.000\u20ac",
    color: "hsl(30, 100%, 50%)",
    isReadOnly: false,
    isCFD: true,
    currency: "EUR",
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
      queryClient.invalidateQueries({ queryKey: ["profit-factor"] });
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
        isBacktest: accountId !== 1 && accountId !== 5,
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
