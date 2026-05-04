import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"
const venvPython = process.platform === "win32"
  ? join(process.cwd(), "ai_service", ".venv", "Scripts", "python.exe")
  : join(process.cwd(), "ai_service", ".venv", "bin", "python")
const pythonCommand = existsSync(venvPython) ? venvPython : process.platform === "win32" ? "python" : "python3"

const commands = [
  ["server", ["run", "dev", "--workspace", "server"]],
  ["ai-service", ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"], { cwd: "ai_service" }],
  ["client", ["run", "dev", "--workspace", "client"]],
]

const children = commands.map(([name, args, options = {}]) => {
  const command = name === "ai-service" ? pythonCommand : npmCommand
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    cwd: options.cwd,
  })

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${name} exited with code ${code}`)
      process.exitCode = code
    }
  })

  return child
})

function shutdown() {
  for (const child of children) {
    child.kill("SIGTERM")
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
