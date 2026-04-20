import express from "express"
import { analyzeSymptoms, getSymptomHistory } from "../controllers/symptomGuidanceController.js"

const router = express.Router()

router.post("/analyze", analyzeSymptoms)
router.get("/history", getSymptomHistory)

export default router
