import { motion } from "framer-motion";
import { BarChart3, Shield, Zap, Globe, LineChart, Wallet } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Lightning Execution",
    description: "Sub-millisecond order execution with smart routing across global exchanges.",
  },
  {
    icon: LineChart,
    title: "Advanced Analytics",
    description: "Professional-grade charting tools with 100+ technical indicators.",
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "256-bit encryption, cold storage, and multi-factor authentication.",
  },
  {
    icon: Globe,
    title: "Global Markets",
    description: "Trade stocks, crypto, forex, and commodities from a single platform.",
  },
  {
    icon: BarChart3,
    title: "Smart Portfolio",
    description: "AI-powered insights and automated rebalancing strategies.",
  },
  {
    icon: Wallet,
    title: "Zero Commission",
    description: "No hidden fees. Keep more of your profits with commission-free trading.",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Everything you need to <span className="text-gradient-primary">win</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Professional tools, zero complexity. Built for traders who demand the best.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group card-elevated rounded-xl p-6 border border-border/30 hover:border-primary/30 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2 text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
