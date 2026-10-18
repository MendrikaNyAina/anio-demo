/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Alias relatif à la racine du projet (et non un chemin absolu) : sous Windows, un chemin
    // absolu peut différer par la casse de la lettre de lecteur (d: / D:) et Vite chargerait
    // alors chaque module en double (deux stores distincts).
    alias: { '@': '/src' },
  },
  test: {
    environment: 'node',
  },
})
