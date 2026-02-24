import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import HeroChart from "./HeroChart";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              <span className="text-xs font-medium text-primary">Live Markets Open</span>
            </div>

            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
              Trade Smarter.
              <br />
              <span className="text-gradient-primary">Grow Faster.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-md mb-8 leading-relaxed">
              Access global markets with advanced analytics, real-time data, and zero-commission trading. Built for the modern investor.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button variant="hero" size="lg" className="text-base px-8">
                Start Trading
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
              <Button variant="hero-outline" size="lg" className="text-base px-8">
                View Demo
              </Button>
            </div>

            <div className="flex items-center gap-8 mt-10">
              {[
                { value: "$2.4B+", label: "Volume traded" },
                { value: "150K+", label: "Active traders" },
                { value: "99.9%", label: "Uptime" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-display text-xl font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="relative hidden lg:block"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            <div className="card-elevated rounded-2xl p-6 border border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground">Portfolio Value</div>
                  <div className="font-display text-3xl font-bold text-foreground">$48,352.18</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">+12.4%</div>
                  <div className="text-xs text-muted-foreground">Past month</div>
                </div>
              </div>
              <div className="h-48">
                <HeroChart />
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-border/50">
                {[
                  { symbol: "BTC", price: "$67,842", change: "+2.1%" },
                  { symbol: "ETH", price: "$3,421", change: "+4.7%" },
                  { symbol: "AAPL", price: "$198.50", change: "-0.3%" },
                ].map((asset) => (
                  <div key={asset.symbol} className="text-center">
                    <div className="text-xs text-muted-foreground">{asset.symbol}</div>
                    <div className="text-sm font-semibold text-foreground">{asset.price}</div>
                    <div className={`text-xs font-medium ${asset.change.startsWith('+') ? 'text-primary' : 'text-destructive'}`}>
                      {asset.change}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
