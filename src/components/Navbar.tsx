import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-surface">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold text-foreground">
            Trading<span className="text-gradient-primary">star</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
          <a href="#markets" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Markets</a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Log in
          </Button>
          <Button variant="hero" size="sm">
            Get Started
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
