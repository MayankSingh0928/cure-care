import express from "express"
import { checkDrugInteractions, getDrugHistory } from "../controllers/drugController.js"

const router = express.Router()

router.post("/check", checkDrugInteractions)
router.get("/history", getDrugHistory)

export default router
