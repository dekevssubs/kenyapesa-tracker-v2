// vitest.config.js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.js'], // We'll create this next
    globals: true, // This allows using describe, it, expect without importing them everywhere
    include: ['tests/**/*.test.{js,jsx,ts,tsx}'], // Specify where your tests live
  },
});