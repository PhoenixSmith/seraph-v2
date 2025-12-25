import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 8080,
    allowedHosts: ['ts1.zocomputer.io', 'seraph-v2-phoenix.zocomputer.io', '.zocomputer.io', 'p1.proxy.zo.computer', '.proxy.zo.computer', 'localhost', '127.0.0.1'],
    hmr: {
      host: 'ts1.zocomputer.io',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 8080,
    strictPort: true,
    allowedHosts: ['all'],
  },
})














