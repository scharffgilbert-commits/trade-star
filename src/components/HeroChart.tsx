import { motion } from "framer-motion";

const HeroChart = () => {
  const points = "M0,80 C20,75 40,60 60,65 C80,70 100,40 120,35 C140,30 160,45 180,30 C200,15 220,25 240,10 C260,5 280,15 300,8 C320,12 340,5 360,2";

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox="0 0 360 100"
        className="w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(145 72% 50%)" stopOpacity="0.6" />
            <stop offset="50%" stopColor="hsl(145 72% 50%)" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(170 70% 55%)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="chartFill" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(145 72% 50%)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="hsl(145 72% 50%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <motion.path
          d={points + " L360,100 L0,100 Z"}
          fill="url(#chartFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
        />

        <motion.path
          d={points}
          fill="none"
          stroke="url(#chartLine)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />

        <motion.circle
          cx="360"
          cy="2"
          r="4"
          fill="hsl(145 72% 50%)"
          className="animate-pulse-glow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
        />
      </svg>
    </div>
  );
};

export default HeroChart;
