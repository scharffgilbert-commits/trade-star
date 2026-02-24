import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          className="relative card-elevated rounded-2xl border border-border/30 p-12 md:p-16 text-center overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-primary/5 rounded-2xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[100px] rounded-full" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-5xl font-bold mb-4">
              Ready to start trading?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Join 150,000+ traders already using Tradingstar. Create your free account in under 2 minutes.
            </p>
            <Button variant="hero" size="lg" className="text-base px-10">
              Create Free Account
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-6 mt-16 pt-8 border-t border-border/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 Tradingstar. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
