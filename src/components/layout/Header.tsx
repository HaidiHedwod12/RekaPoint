import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightOnRectangleIcon, UserIcon, MapIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect border-b border-cyan-500/20 sticky top-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 h-auto sm:h-16 py-2 sm:py-0">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="flex items-center space-x-2 sm:space-x-3"
            >
              <div className="relative">
                <img 
                  src="/Rekadwipa.png" 
                  alt="PT Rekadwipa Teknika Studio" 
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain pulse-glow"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <MapIcon className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 pulse-glow hidden" />
                <div className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-cyan-400 rounded-full animate-ping" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  RekaPoint
                </h1>
                <p className="text-xs text-cyan-300/80 font-medium">PT Rekadwipa Teknika Studio</p>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
            <div className="flex items-center space-x-2 sm:space-x-3 text-gray-200 glass-effect px-3 sm:px-4 py-2 rounded-lg w-full sm:w-auto justify-between sm:justify-end">
              <UserIcon className="w-5 h-5 text-cyan-400" />
              <div className="text-left sm:text-right flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium truncate">{user?.nama}</p>
                <p className="text-[10px] sm:text-xs text-cyan-300/80 capitalize truncate">{user?.role} • {user?.jabatan}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="border-cyan-500/50 text-cyan-300 hover:bg-cyan-500/10 w-full sm:w-auto"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </motion.header>
  );
};