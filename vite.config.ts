import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import fs from 'fs';
import dotenv from 'dotenv';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  
  // Load HiddenApi.env for development if it exists
  let hiddenEnv = {};
  if (fs.existsSync('./.env.local') || fs.existsSync('./HiddenApi.env')) {
    const envFile = fs.existsSync('./.env.local') ? './.env.local' : './HiddenApi.env';
    const envContent = fs.readFileSync(envFile, 'utf-8');
    hiddenEnv = dotenv.parse(envContent);
  }

  // Merge environments (HiddenApi.env takes precedence)
  const mergedEnv = { ...env, ...hiddenEnv };

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(mergedEnv.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
