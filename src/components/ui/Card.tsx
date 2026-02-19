import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = true 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hover ? { 
        scale: 1.02, 
        boxShadow: '0 20px 40px rgba(81, 228, 255, 0.2)' 
      } : {}}
      className={`glass-effect border border-cyan-500/20 rounded-xl p-4 sm:p-6 transition-all duration-300 hover:border-cyan-400/50 ${className}`}
    >
      {children}
    </motion.div>
  );
};