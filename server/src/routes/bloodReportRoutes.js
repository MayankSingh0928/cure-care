import express from "express"
import { analyzeReport, getBloodReportHistory } from "../controllers/bloodReportController.js"
import { uploadReport } from "../middleware/uploadMiddleware.js"

const router = express.Router()

router.post("/analyze", uploadReport, analyzeReport)
router.get("/history", getBloodReportHistory)

export default router
