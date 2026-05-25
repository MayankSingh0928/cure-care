import express from "express"
import multer from "multer"
import os from "node:os"
import path from "node:path"
import { randomUUID } from "node:crypto"
import fs from "node:fs"
import { extractReport } from "../controllers/reportExtractController.js"

const router = express.Router()
const uploadDir = path.join(os.tmpdir(), "curecare-report-uploads")

fs.mkdirSync(uploadDir, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, uploadDir)
    },
    filename(req, file, callback) {
      const extension = path.extname(file.originalname || "")
      callback(null, `${randomUUID()}${extension}`)
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
})

function uploadFile(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) return next()

    const statusCode = error instanceof multer.MulterError ? 400 : 500
    return res.status(statusCode).json({
      success: false,
      message: error.message || "File upload failed.",
      error: {
        code: error.code || "UPLOAD_FAILED",
        status: statusCode,
        requestId: req.requestId,
      },
    })
  })
}

router.post("/extract", uploadFile, extractReport)

export default router
