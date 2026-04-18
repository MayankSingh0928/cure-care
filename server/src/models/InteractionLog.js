import mongoose from "mongoose"

const interactionLogSchema = new mongoose.Schema(
  {
    drugs: [String],
    sourceSummary: String,
    interactionCount: Number,
    interactions: [mongoose.Schema.Types.Mixed],
  },
  { timestamps: true }
)

export default mongoose.models.InteractionLog || mongoose.model("InteractionLog", interactionLogSchema)
