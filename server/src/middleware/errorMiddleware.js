export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500
  const message = error.message || "Server error"
  const isImageOcrError = error.code === "OCR_FAILED"

  if (isImageOcrError) {
    console.log("[image-ocr] request_failed", {
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      path: req.originalUrl,
      method: req.method,
      message,
      cause: error.cause?.message || undefined,
    })
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: error.code || (statusCode === 404 ? "NOT_FOUND" : "REQUEST_FAILED"),
      message,
      hint:
        error.code === "GEMINI_QUOTA_EXCEEDED"
          ? "Gemini free-tier quota is exhausted. Wait for the retry window, use another Gemini API key/project, enable billing, upload a PDF, or paste the key report values manually."
          : isImageOcrError
            ? "Try a clearer image, upload the report as a PDF, or paste the key report values manually."
            : undefined,
      status: statusCode,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  })
}
