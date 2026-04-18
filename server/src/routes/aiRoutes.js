import express from "express"
import { analyzeBloodRisk, analyzeDrugRisk } from "../controllers/aiController.js"

const router = express.Router()

router.post("/drug-risk", analyzeDrugRisk)
router.post("/blood-report", analyzeBloodRisk)

export default router
