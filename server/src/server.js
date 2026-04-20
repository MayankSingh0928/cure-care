import cors from "cors"
import express from "express"
import { randomUUID } from "node:crypto"
import { env } from "./config/env.js"
import { errorHandler, notFound } from "./middleware/errorMiddleware.js"
import bloodReportRoutes from "./routes/bloodReportRoutes.js"
import drugApiRoutes from "./routes/drugApiRoutes.js"
import featureRoutes from "./routes/featureRoutes.js"
import symptomGuidanceRoutes from "./routes/symptomGuidanceRoutes.js"

const app = express()
const host = "0.0.0.0"
const serviceStartedAt = new Date()

const configuredOrigins = [env.clientUrl, ...(env.corsOrigins || "").split(",")]
  .map((origin) => origin.trim())
  .filter(Boolean)

const allowedOrigins = new Set([
  ...configuredOrigins,
  "https://cure-care-client.vercel.app",
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

app.use((req, res, next) => {
  const requestId = randomUUID()
  req.requestId = requestId
  res.setHeader("X-Request-Id", requestId)
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("Referrer-Policy", "no-referrer")
  next()
})

app.use(express.json({ limit: "2mb" }))
app.use(express.urlencoded({ extended: true }))

app.get("/api", (req, res) => {
  res.json({
    service: "curecare-api",
    version: "1.0.0",
    status: "ok",
    endpoints: {
      health: "GET /api/health",
      medicineCheck: "POST /api/features/medicine/check",
      medicineHistory: "GET /api/features/medicine/history",
      bloodReportAnalyze: "POST /api/features/blood-report/analyze",
      bloodReportHistory: "GET /api/features/blood-report/history",
      careGuidance: "POST /api/features/care-guidance/analyze",
      careGuidanceHistory: "GET /api/features/care-guidance/history",
    },
    legacyEndpoints: {
      drugCheck: "POST /api/drugs/check",
      drugHistory: "GET /api/drugs/history",
      bloodReportAnalyze: "POST /api/blood-reports/analyze",
      bloodReportHistory: "GET /api/blood-reports/history",
      symptomGuidance: "POST /api/symptoms/analyze",
      symptomHistory: "GET /api/symptoms/history",
    },
    requestId: req.requestId,
  })
})

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "curecare-api",
    uptime: Math.round(process.uptime()),
    startedAt: serviceStartedAt.toISOString(),
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  })
})

app.use("/api/features", featureRoutes)
app.use("/api/drugs", drugApiRoutes)
app.use("/api/blood-reports", bloodReportRoutes)
app.use("/api/symptoms", symptomGuidanceRoutes)

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
