import React from 'react';
import { motion } from 'framer-motion';

interface MenuCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  gradient?: string;
  iconBg?: string;
}

export const MenuCard: React.FC<MenuCardProps> = ({
  title,
  description,
  icon: Icon,
  onClick,
  gradient = 'from-cyan-500 to-blue-600',
  iconBg = 'from-cyan-500 to-blue-600'
}) => {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="cursor-pointer group"
    >
      <div className="glass-effect border border-cyan-500/20 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20 relative overflow-hidden w-full">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-32 sm:h-32 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full -translate-y-8 sm:-translate-y-16 translate-x-8 sm:translate-x-16" />
        </div>
        <div className="relative z-10">
          <div className={`w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-br ${iconBg} rounded-xl flex items-center justify-center mb-2 sm:mb-4 group-hover:scale-110 transition-transform duration-300 pulse-glow`}>
            <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
          </div>
          <h3 className="text-base sm:text-xl font-semibold text-white mb-1 sm:mb-2 group-hover:text-cyan-300 transition-colors">
            {title}
          </h3>
          <p className="text-xs sm:text-gray-400 group-hover:text-gray-300 transition-colors">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
};