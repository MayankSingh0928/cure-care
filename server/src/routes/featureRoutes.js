import express from "express"
import { analyzeReport, getBloodReportHistory } from "../controllers/bloodReportController.js"
import { checkDrugInteractions, getDrugHistory } from "../controllers/drugController.js"
import { analyzeSymptoms, getSymptomHistory } from "../controllers/symptomGuidanceController.js"
import { uploadReport } from "../middleware/uploadMiddleware.js"

const router = express.Router()

router.post("/medicine/check", checkDrugInteractions)
router.get("/medicine/history", getDrugHistory)

router.post("/blood-report/analyze", uploadReport, analyzeReport)
router.get("/blood-report/history", getBloodReportHistory)

router.post("/care-guidance/analyze", analyzeSymptoms)
router.get("/care-guidance/history", getSymptomHistory)

export default router
