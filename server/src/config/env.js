import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, "../../../.env") })
dotenv.config()

export const env = {
  port: process.env.PORT || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  corsOrigins: process.env.CORS_ORIGINS || "",
  mongoUri: process.env.MONGO_URI || "",
  openFdaEventUrl: process.env.OPENFDA_EVENT_URL || "https://api.fda.gov/drug/event.json",
  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
}
