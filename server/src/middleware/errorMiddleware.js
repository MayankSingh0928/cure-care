export function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.originalUrl}`)
  error.statusCode = 404
  next(error)
}

export function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500
  const message = error.message || "Server error"

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: error.code || (statusCode === 404 ? "NOT_FOUND" : "REQUEST_FAILED"),
      message,
      status: statusCode,
      path: req.originalUrl,
      method: req.method,
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
    },
  })
}
