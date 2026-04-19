import { createRequire } from "module"
import { env } from "../config/env.js"

const require = createRequire(import.meta.url)

function isTextFile(file) {
  return file?.mimetype?.startsWith("text/") || file?.mimetype === "application/csv" || file?.originalname?.toLowerCase().endsWith(".csv")
}

function isPdf(file) {
  return file?.mimetype === "application/pdf" || file?.originalname?.toLowerCase().endsWith(".pdf")
}

function isImage(file) {
  return file?.mimetype?.startsWith("image/")
}

async function recognizeImageBuffer(buffer) {
  if (!env.enableOcr) {
    return ""
  }

  let createWorker
  let englishOcrData

  try {
    ;({ createWorker } = await import("tesseract.js"))
    englishOcrData = require("@tesseract.js-data/eng")
  } catch {
    throw new Error("OCR is enabled but OCR dependencies are not installed. Set ENABLE_OCR=false or deploy OCR on a larger service.")
  }

  const worker = await createWorker(englishOcrData.code, undefined, {
    gzip: englishOcrData.gzip,
    langPath: englishOcrData.langPath,
  })

  try {
    const result = await worker.recognize(buffer)
    return result.data?.text || ""
  } finally {
    await worker.terminate()
  }
}

async function extractPdfText(file) {
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: file.buffer })

  try {
    const result = await parser.getText()
    const text = result.text || ""
    const pageTexts = []

    try {
      if (!env.enableOcr) {
        return { text, source: "pdf" }
      }

      const screenshots = await parser.getScreenshot({
        first: 5,
        imageBuffer: true,
        imageDataUrl: false,
        scale: 2,
      })

      for (const page of screenshots.pages || []) {
        if (page.data) {
          pageTexts.push(await recognizeImageBuffer(page.data))
        }
      }
    } catch (error) {
      if (text.trim().length < 20) {
        throw error
      }
    }

    const combinedText = [text, ...pageTexts].filter(Boolean).join("\n")
    const source = pageTexts.length > 0 ? "pdf+ocr" : "pdf"
    return { text: combinedText, source }
  } finally {
    await parser.destroy()
  }
}

async function extractImageText(file) {
  return recognizeImageBuffer(file.buffer)
}

export async function extractReportText(file) {
  if (!file?.buffer) return { text: "", source: "none" }

  if (isTextFile(file)) {
    return { text: file.buffer.toString("utf8"), source: "text" }
  }

  if (isPdf(file)) {
    return extractPdfText(file)
  }

  if (isImage(file)) {
    return { text: await extractImageText(file), source: "ocr" }
  }

  return { text: "", source: "unsupported" }
}
