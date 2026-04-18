import { spawn } from "node:child_process"

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm"

const commands = [
  ["server", ["run", "dev", "--workspace", "server"]],
  ["client", ["run", "dev", "--workspace", "client"]],
]

const children = commands.map(([name, args]) => {
  const child = spawn(npmCommand, args, {
    stdio: "inherit",
    shell: true,
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
