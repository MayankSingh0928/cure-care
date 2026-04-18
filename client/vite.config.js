import react from "@vitejs/plugin-react"
import { defineConfig, transformWithEsbuild } from "vite"

function jsAsJsx() {
  return {
    name: "js-as-jsx",
    async transform(code, id) {
      if (!id.match(/src\/.*\.js$/)) return null
      return transformWithEsbuild(code, id, {
        loader: "jsx",
        jsx: "automatic",
      })
    },
  }
}

export default defineConfig({
  plugins: [jsAsJsx(), react()],
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
})
