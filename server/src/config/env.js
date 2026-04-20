import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, "../../../.env") })
dotenv.config()

const configuredGeminiKey = (process.env.GEMINI_API_KEY || "").trim()

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigins: process.env.CORS_ORIGINS || "",
  openFdaEventUrl: process.env.OPENFDA_EVENT_URL || "https://api.fda.gov/drug/event.json",
  geminiApiKey: configuredGeminiKey,
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
}
