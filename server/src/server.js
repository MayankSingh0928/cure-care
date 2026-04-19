import cors from "cors"
import express from "express"
import { env } from "./config/env.js"
import { errorHandler, notFound } from "./middleware/errorMiddleware.js"
import bloodReportRoutes from "./routes/bloodReportRoutes.js"
import drugApiRoutes from "./routes/drugApiRoutes.js"

const app = express()
const host = "0.0.0.0"

const configuredOrigins = [env.clientUrl, ...(env.corsOrigins || "").split(",")]
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([
  ...configuredOrigins,
  "http://localhost:5173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://0.0.0.0:5173",
  "http://0.0.0.0:4173",
])

const localNetworkOriginPattern =
  /^https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):(?:5173|4173)$/

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || localNetworkOriginPattern.test(origin)) {
        return callback(null, true)
      }

      return callback(null, false)
    },
  })
)
app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true }))

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "curecare-api" })
})

app.use("/api/drugs", drugApiRoutes)
app.use("/api/blood-reports", bloodReportRoutes)

app.use(notFound)
app.use(errorHandler)

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error)
})

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error)
  process.exit(1)
})

app.listen(env.port, host, () => {
  console.log(`cure&care API running on 0.0.0.0:${env.port}`)
})
