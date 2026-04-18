import mongoose from "mongoose"

const prescriptionSchema = new mongoose.Schema(
  {
    patientName: String,
    medicines: [{ name: String, dose: String, frequency: String }],
    conditions: [String],
    supplements: [String],
  },
  { timestamps: true }
)

export default mongoose.models.Prescription || mongoose.model("Prescription", prescriptionSchema)
