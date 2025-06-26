'use client';

import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="relative p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 group dark:bg-gray-800/50 dark:border-gray-700/50"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <motion.div
        initial={false}
        animate={{
          rotate: theme === 'dark' ? 180 : 0,
          scale: theme === 'dark' ? 1 : 0.8,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="relative"
      >
        {theme === 'light' ? (
          <Sun className="w-5 h-5 text-yellow-600 group-hover:text-yellow-500 transition-colors" />
        ) : (
          <Moon className="w-5 h-5 text-blue-400 group-hover:text-blue-300 transition-colors" />
        )}
      </motion.div>
      
      {/* Glow effect */}
      <motion.div
        className={`absolute inset-0 rounded-xl ${
          theme === 'light' 
            ? 'bg-gradient-to-r from-yellow-400/20 to-orange-400/20' 
            : 'bg-gradient-to-r from-blue-500/20 to-purple-500/20'
        }`}
        animate={{
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.button>
  );
}