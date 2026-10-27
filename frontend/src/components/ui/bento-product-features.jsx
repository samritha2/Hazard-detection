import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// Animation variants for the container to stagger children
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

// Animation variants for each grid item
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
    },
  },
};

/**
 * A responsive, animated bento grid layout component.
 */
export const BentoGridShowcase = ({
  integration,
  trackers,
  statistic,
  focus,
  productivity,
  shortcuts,
  className,
}) => {
  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={cn(
        "grid w-full grid-cols-1 gap-5 md:grid-cols-3 md:grid-rows-3 auto-rows-[minmax(180px,auto)]",
        className
      )}
    >
      {/* Slot 1: Integration (Spans 3 rows on md) */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-3">
        {integration}
      </motion.div>

      {/* Slot 2: Trackers */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {trackers}
      </motion.div>

      {/* Slot 3: Statistic */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {statistic}
      </motion.div>

      {/* Slot 4: Focus */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {focus}
      </motion.div>

      {/* Slot 5: Productivity */}
      <motion.div variants={itemVariants} className="md:col-span-1 md:row-span-1">
        {productivity}
      </motion.div>

      {/* Slot 6: Shortcuts (Spans 2 cols) */}
      <motion.div variants={itemVariants} className="md:col-span-2 md:row-span-1">
        {shortcuts}
      </motion.div>
    </motion.section>
  );
};
