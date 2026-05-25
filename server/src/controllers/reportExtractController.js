import { extractUploadedReportText } from "../services/reportExtractService.js"

export async function extractReport(req, res) {
  try {
    const result = await extractUploadedReportText(req.file)
    res.json({
      success: true,
      ...result,
      requestId: req.requestId,
    })
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Report extraction failed.",
      error: {
        code: error.code || "REPORT_EXTRACTION_FAILED",
        status: error.statusCode || 500,
        requestId: req.requestId,
      },
    })
  }
}
