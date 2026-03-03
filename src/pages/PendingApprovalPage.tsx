import { TrendingUp, LogOut, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function PendingApprovalPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2">
          <TrendingUp className="h-8 w-8 text-primary" />
          <span className="font-display text-2xl font-bold text-foreground">
            BörsenStar
          </span>
          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gold/15 text-gold border border-gold/30">
            V8
          </span>
        </div>

        {/* Status Card */}
        <div className="bg-card border border-border rounded-xl p-8 space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Clock className="h-8 w-8 text-amber-500" />
          </div>

          <h1 className="text-xl font-semibold text-foreground">
            Konto wartet auf Freischaltung
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Dein Konto <span className="font-mono text-foreground">{user?.email}</span> wurde
            erfolgreich registriert. Ein Administrator wird dein Konto in Kürze prüfen und freischalten.
          </p>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Du wirst automatisch weitergeleitet, sobald dein Konto freigeschaltet wurde.
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={signOut}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Abmelden
        </button>
      </div>
    </div>
  );
}
