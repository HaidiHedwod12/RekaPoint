import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightIcon, MapIcon, UserIcon, LockClosedIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { checkSupabaseConnection } from '../../lib/supabase';
import { supabase } from '../../lib/supabase';

export const LoginForm: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  React.useEffect(() => {
    if (!checkSupabaseConnection()) {
      setError('⚠️ Database belum terhubung. Silakan klik tombol "Connect to Supabase" di pojok kanan atas untuk setup database.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('Login attempt with username:', username);

    try {
      await login(username.trim().toLowerCase(), password.trim());
    } catch (err) {
      console.error('Login failed:', err);
      setError(err instanceof Error ? err.message : 'Login gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 geometric-bg opacity-40" />
      <div className="fixed inset-0 map-pattern" />
      
      {/* Floating GIS elements */}
      <motion.div
        animate={{ 
          rotate: 360,
          scale: [1, 1.1, 1]
        }}
        transition={{ 
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
        }}
        className="fixed top-20 left-20 w-16 h-16 border-2 border-cyan-500/30 rounded-full"
      />
      <motion.div
        animate={{ 
          y: [-10, 10, -10],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="fixed top-32 right-32"
      >
        <GlobeAltIcon className="w-12 h-12 text-blue-400/50" />
      </motion.div>
      <motion.div
        animate={{ 
          x: [-5, 5, -5],
          opacity: [0.3, 0.7, 0.3]
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className="fixed bottom-32 left-32 w-8 h-8 bg-cyan-400/20 rounded-lg rotate-45"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md p-8 glass-effect rounded-2xl shadow-2xl relative z-10 border border-cyan-500/20"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
            className="mx-auto w-20 h-20 flex items-center justify-center mb-6 relative"
          >
            {/* Glowing effect around logo */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/30 to-blue-600/30 rounded-lg blur-lg animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-blue-500/20 rounded-lg" />
            
            {/* Logo container */}
            <div className="relative z-10 w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-cyan-500/30 flex items-center justify-center shadow-lg">
            <img 
              src="/Rekadwipa.png" 
              alt="PT Rekadwipa Teknika Studio" 
              className="w-14 h-14 object-contain filter drop-shadow-lg"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <MapIcon className="w-12 h-12 text-cyan-400 hidden drop-shadow-lg" />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2"
          >
            RekaPoint
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-cyan-300/80 font-medium"
          >
            PT Rekadwipa Teknika Studio
          </motion.p>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-4 flex items-center justify-center space-x-2 text-sm text-gray-400"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span>Produktivitas Terdepan, Hasil Terbaik</span>
          </motion.div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1 }}
          >
            <Input
              label="Username"
              type="text"
              placeholder="Masukkan username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              icon={<UserIcon className="w-5 h-5" />}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.2 }}
          >
            <Input
              label="Password"
              type="password"
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<LockClosedIcon className="w-5 h-5" />}
            />
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect border border-red-500/50 text-red-300 px-4 py-3 rounded-lg bg-red-500/10"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
          >
            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 pulse-glow"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Masuk...
                </div>
              ) : (
                <div className="flex items-center">
                  <ArrowRightIcon className="w-5 h-5 mr-2" />
                  Masuk
                </div>
              )}
            </Button>
          </motion.div>
        </form>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-8 text-center"
        >
          <p className="text-cyan-300/80 font-medium drop-shadow-sm mt-4 text-xs whitespace-nowrap overflow-hidden text-ellipsis" style={{ textShadow: '0 0 6px #0891b2, 0 0 2px #0ea5e9' }}>© 2025 PT Rekadwipa Teknika Studio. Internal Use Only.</p>
        </motion.div>
      </motion.div>
    </div>
  );
};