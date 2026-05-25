import { env } from "../config/env.js"
import { safeJsonFetch } from "./apiHelper.js"

let pdfParseModule

function logImageOcr(event, details = {}) {
  console.log(`[image-ocr] ${event}`, {
    timestamp: new Date().toISOString(),
    ...details,
  })
}

function imageOcrError(message, code = "OCR_FAILED", cause) {
  const error = new Error(message)
  error.statusCode = 400
  error.code = code
  if (cause) error.cause = cause
  return error
}

function geminiUnavailableError() {
  return imageOcrError("Image OCR requires Gemini, but GEMINI_API_KEY is not configured on the server.", "GEMINI_OCR_NOT_CONFIGURED")
}

function geminiModels() {
  return [env.geminiModel, "gemini-2.5-flash-lite", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-flash-lite-latest"].filter(
    (model, index, models) => model && models.indexOf(model) === index
  )
}

function geminiRequestBody(buffer, mimetype) {
  return JSON.stringify({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Extract the visible text from this medical report image. Return plain text only. Do not summarize, diagnose, or add extra explanation.",
          },
          {
            inline_data: {
              mime_type: mimetype,
              data: buffer.toString("base64"),
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  })
}

function quotaRetryHint(message = "") {
  return message.match(/retry in ([^.]+\.)/i)?.[1] || ""
}

function isTextFile(file) {
  return file?.mimetype?.startsWith("text/") || file?.mimetype === "application/csv" || file?.originalname?.toLowerCase().endsWith(".csv")
}

function isPdf(file) {
  return file?.mimetype === "application/pdf" || file?.originalname?.toLowerCase().endsWith(".pdf")
}

function isImage(file) {
  return file?.mimetype?.startsWith("image/")
}

function geminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .filter(Boolean)
      .join("\n")
      .trim() || ""
  )
}

async function recognizeImageWithGemini(buffer, mimetype = "image/png") {
  if (!env.geminiApiKey) {
    logImageOcr("gemini_skipped", {
      reason: "GEMINI_API_KEY is missing.",
      bytes: buffer?.length || 0,
      mimetype,
    })
    throw geminiUnavailableError()
  }

  if (!buffer?.length) {
    logImageOcr("gemini_skipped", {
      reason: "Image buffer is empty.",
      bytes: buffer?.length || 0,
      mimetype,
    })
    return ""
  }

  const failures = []
  const models = geminiModels()

  for (const [index, model] of models.entries()) {
    const startedAt = Date.now()
    logImageOcr("gemini_start", {
      bytes: buffer.length,
      mimetype,
      model,
    })

    const response = await safeJsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.geminiApiKey,
      },
      body: geminiRequestBody(buffer, mimetype),
      timeoutMs: 12000,
    })

    if (!response.ok) {
      const errorMessage = response.data?.error?.message || response.error || "Gemini OCR request failed"
      failures.push({ model, status: response.status, message: errorMessage })
      logImageOcr("gemini_failed", {
        durationMs: Date.now() - startedAt,
        model,
        status: response.status,
        error: errorMessage,
      })

      const nextModel = models[index + 1]
      if (response.status === 429 && nextModel) {
        logImageOcr("gemini_model_switch", {
          reason: "quota_exceeded",
          fromModel: model,
          toModel: nextModel,
        })
      }

      continue
    }

    const text = geminiText(response.data)
    logImageOcr("gemini_success", {
      durationMs: Date.now() - startedAt,
      model,
      extractedCharacters: text.length,
    })
    return text
  }

  const quotaFailure = failures.find((failure) => failure.status === 429)
  if (quotaFailure) {
    const retryHint = quotaRetryHint(quotaFailure.message)
    throw imageOcrError(
      `Gemini image OCR quota is exceeded for the available fallback models${retryHint ? `; please retry in ${retryHint}` : ""}. You can also upload a PDF or paste report values manually.`,
      "GEMINI_QUOTA_EXCEEDED"
    )
  }

  return ""
}

export async function recognizeReportImage(buffer, mimetype = "image/png") {
  logImageOcr("image_received", {
    bytes: buffer?.length || 0,
    mimetype,
  })

  const geminiOcrText = await recognizeImageWithGemini(buffer, mimetype)
  if (geminiOcrText) return geminiOcrText

  logImageOcr("failed", {
    provider: "gemini",
    reason: "No text returned before timeout or provider error.",
  })
  throw imageOcrError("Gemini could not read text from this image. Please upload a clearer image, upload a PDF, or paste report values manually.")
}

async function extractPdfText(file) {
  pdfParseModule ||= await import("pdf-parse")
  const { PDFParse } = pdfParseModule
  const parser = new PDFParse({ data: file.buffer })

  try {
    const result = await parser.getText()
    const text = result.text || ""
    return { text, source: "pdf" }
  } finally {
    await parser.destroy()
  }
}

async function extractImageText(file) {
  return recognizeReportImage(file.buffer, file.mimetype)
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
    const text = await extractImageText(file)
    return { text, source: "ocr" }
  }

  return { text: "", source: "unsupported" }
}
