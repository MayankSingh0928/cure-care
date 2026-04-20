import { createRequire } from "module"

const require = createRequire(import.meta.url)
let pdfParseModule
let tesseractModule
let englishOcrData

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
  tesseractModule ||= await import("tesseract.js")
  englishOcrData ||= require("@tesseract.js-data/eng")

  const { createWorker, PSM } = tesseractModule
  const worker = await createWorker(englishOcrData.code, undefined, {
    gzip: englishOcrData.gzip,
    langPath: englishOcrData.langPath,
  })

  try {
    const texts = []
    const modes = [PSM.SINGLE_COLUMN, PSM.SINGLE_BLOCK]

    for (const mode of modes) {
      await worker.setParameters({
        preserve_interword_spaces: "1",
        tessedit_pageseg_mode: mode,
      })
      const result = await worker.recognize(buffer)
      if (result.data?.text) texts.push(result.data.text)
    }

    return texts.join("\n")
  } finally {
    await worker.terminate()
  }
}

async function extractPdfText(file) {
  pdfParseModule ||= await import("pdf-parse")
  const { PDFParse } = pdfParseModule
  const parser = new PDFParse({ data: file.buffer })

  try {
    const result = await parser.getText()
    const text = result.text || ""
    const pageTexts = []

    try {
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
