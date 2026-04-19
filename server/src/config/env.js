import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, "../../../.env") })
dotenv.config()

export const env = {
  port: process.env.PORT,
  clientUrl: process.env.CLIENT_URL,
  corsOrigins: process.env.CORS_ORIGINS,
  openFdaEventUrl: process.env.OPENFDA_EVENT_URL || "https://api.fda.gov/drug/event.json",
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
}
