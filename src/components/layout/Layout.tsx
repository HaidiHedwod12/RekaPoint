import React from 'react';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background patterns */}
      <div className="fixed inset-0 geometric-bg opacity-30" />
      <div className="fixed inset-0 map-pattern" />
      
      {/* Floating geometric shapes */}
      <div className="fixed top-20 left-10 w-32 h-32 border border-cyan-500/20 rounded-full floating-animation" style={{ animationDelay: '0s' }} />
      <div className="fixed top-40 right-20 w-24 h-24 border border-blue-500/20 rotate-45 floating-animation" style={{ animationDelay: '2s' }} />
      <div className="fixed bottom-32 left-1/4 w-16 h-16 border border-cyan-400/20 rounded-lg floating-animation" style={{ animationDelay: '4s' }} />
      <div className="fixed bottom-20 right-1/3 w-20 h-20 border border-blue-400/20 rounded-full floating-animation" style={{ animationDelay: '1s' }} />
      
      <Header />
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
};