import mongoose from "mongoose"

const bloodReportLogSchema = new mongoose.Schema(
  {
    language: { type: String, enum: ["en", "hi"], default: "en" },
    riskPercentage: Number,
    findings: [mongoose.Schema.Types.Mixed],
    summary: String,
  },
  { timestamps: true }
)

export default mongoose.models.BloodReportLog || mongoose.model("BloodReportLog", bloodReportLogSchema)
