import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ВАЖНО: base: '/' так как всё лежит в корне
export default defineConfig({
  plugins: [react()],
  base: '/',
})
