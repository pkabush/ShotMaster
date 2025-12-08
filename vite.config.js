// vite.config.js
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/ShotMaster/',
  build: {
    outDir: 'docs',
    emptyOutDir: true
  }
})