import fs from "node:fs/promises"
import { recognizeReportImage } from "../utils/reportTextExtractor.js"

function isTextFile(file) {
  return file?.mimetype?.startsWith("text/") || file?.mimetype === "application/csv" || file?.originalname?.toLowerCase().endsWith(".csv")
}

function isPdf(file) {
  return file?.mimetype === "application/pdf" || file?.originalname?.toLowerCase().endsWith(".pdf")
}

function isImage(file) {
  return file?.mimetype?.startsWith("image/")
}

function createHttpError(message, statusCode = 400, code = "REPORT_EXTRACTION_FAILED") {
  const error = new Error(message)
  error.statusCode = statusCode
  error.code = code
  return error
}

async function extractTextFile(file) {
  return fs.readFile(file.path, "utf8")
}

async function extractPdfFile(file) {
  const { PDFParse } = await import("pdf-parse")
  const buffer = await fs.readFile(file.path)
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText()
    return result.text || ""
  } finally {
    await parser.destroy()
  }
}

async function extractImageFile(file) {
  try {
    const buffer = await fs.readFile(file.path)
    return recognizeReportImage(buffer, file.mimetype)
  } catch (error) {
    const safeError = createHttpError("Image OCR failed. Please upload a clearer image, upload a PDF, or paste report values manually.", 400, "OCR_FAILED")
    safeError.cause = error
    throw safeError
  }
}

async function deleteUploadedFile(file) {
  if (!file?.path) return
  await fs.unlink(file.path).catch(() => {})
}

export async function extractUploadedReportText(file) {
  try {
    if (!file) {
      throw createHttpError('Upload a report file using the "file" field.', 400, "FILE_REQUIRED")
    }

    let text = ""
    let source = "unsupported"

    if (isTextFile(file)) {
      text = await extractTextFile(file)
      source = "text"
    } else if (isPdf(file)) {
      text = await extractPdfFile(file)
      source = "pdf"
    } else if (isImage(file)) {
      text = await extractImageFile(file)
      source = "ocr"
    } else {
      throw createHttpError("Unsupported file format. Upload TXT, CSV, PDF, JPG, JPEG, or PNG.", 400, "UNSUPPORTED_FILE_TYPE")
    }

    return {
      source,
      text,
      extractedCharacters: text.length,
      file: {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      },
    }
  } finally {
    await deleteUploadedFile(file)
  }
}
