import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="fixed inset-0 geometric-bg opacity-30 hidden sm:block" />
      <div className="fixed inset-0 map-pattern hidden sm:block" />
      
      {/* Floating geometric shapes */}
      <div className="fixed top-20 left-10 w-16 h-16 sm:w-32 sm:h-32 border border-cyan-500/20 rounded-full floating-animation hidden sm:block" style={{ animationDelay: '0s' }} />
      <div className="fixed top-40 right-20 w-12 h-12 sm:w-24 sm:h-24 border border-blue-500/20 rotate-45 floating-animation hidden sm:block" style={{ animationDelay: '2s' }} />
      <div className="fixed bottom-32 left-1/4 w-8 h-8 sm:w-16 sm:h-16 border border-cyan-400/20 rounded-lg floating-animation hidden sm:block" style={{ animationDelay: '4s' }} />
      <div className="fixed bottom-20 right-1/3 w-10 h-10 sm:w-20 sm:h-20 border border-blue-400/20 rounded-full floating-animation hidden sm:block" style={{ animationDelay: '1s' }} />
      
      <Header />
      <main className="relative z-10 overflow-x-auto px-2 sm:px-0">
        {children}
      </main>
    </div>
  );
};