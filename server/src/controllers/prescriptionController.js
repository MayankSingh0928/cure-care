const prescriptions = []

export function createPrescription(req, res) {
  const prescription = {
    id: crypto.randomUUID(),
    medicines: req.body.medicines || [],
    patient: req.body.patient || {},
    createdAt: new Date().toISOString(),
  }
  prescriptions.unshift(prescription)
  res.status(201).json({ prescription })
}

export function listPrescriptions(req, res) {
  res.json({ prescriptions: prescriptions.slice(0, 50) })
}
