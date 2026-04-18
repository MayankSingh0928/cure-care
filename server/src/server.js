import cors from "cors"
import express from "express"
import { connectDb } from "./config/db.js"
import { env } from "./config/env.js"
import { errorHandler, notFound } from "./middleware/errorMiddleware.js"
import aiRoutes from "./routes/aiRoutes.js"
import bloodReportRoutes from "./routes/bloodReportRoutes.js"
import drugApiRoutes from "./routes/drugApiRoutes.js"
import prescriptionRoutes from "./routes/prescriptionRoutes.js"

const app = express()

const allowedOrigins = new Set([
  env.clientUrl,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://0.0.0.0:5173",
])

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
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

app.use("/api/prescriptions", prescriptionRoutes)
app.use("/api/ai", aiRoutes)
app.use("/api/drugs", drugApiRoutes)
app.use("/api/blood-reports", bloodReportRoutes)

app.use(notFound)
app.use(errorHandler)

await connectDb()

app.listen(env.port, () => {
  console.log(`cure&care API running on http://localhost:${env.port}`)
})
