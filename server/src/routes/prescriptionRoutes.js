import express from "express"
import { createPrescription, listPrescriptions } from "../controllers/prescriptionController.js"

const router = express.Router()

router.post("/", createPrescription)
router.get("/", listPrescriptions)

export default router
