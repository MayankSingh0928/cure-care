import mongoose from "mongoose"
import { env } from "./env.js"

export async function connectDb() {
  if (!env.mongoUri) {
    console.log("MongoDB disabled: MONGO_URI is not configured.")
    return
  }

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 1500 })
    console.log("MongoDB connected.")
  } catch (error) {
    console.warn(`MongoDB unavailable, continuing with in-memory logs: ${error.message}`)
  }
}
