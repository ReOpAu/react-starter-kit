'use client';

import { motion } from "framer-motion";
import { cn } from "~/lib/utils";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  offset?: number;
  direction?: "up" | "down" | "left" | "right";
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
}

export function BlurFade({
  children,
  className,
  duration = 0.4,
  delay = 0,
  offset = 6,
  direction = "down",
  inView = false,
  inViewMargin = "-50px",
  blur = "6px",
}: BlurFadeProps) {
  const variants = {
    hidden: {
      opacity: 0,
      filter: `blur(${blur})`,
      y: direction === "down" ? offset : direction === "up" ? -offset : 0,
      x: direction === "right" ? offset : direction === "left" ? -offset : 0,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      x: 0,
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      viewport={{ once: true, margin: inViewMargin }}
      variants={variants}
      transition={{ duration, delay }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
} 