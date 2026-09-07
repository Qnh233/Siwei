import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**'],
  },
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      // Rust 在 dev 模式下会持续重写 target 内的可执行文件；Windows 对这些文件加锁时会让 chokidar 报 EBUSY。
      ignored: ['**/src-tauri/target/**'],
    },
  },
})
