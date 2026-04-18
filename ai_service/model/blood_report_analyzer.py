from model.predictor import clamp_score, risk_band
from model.preprocessor import clean_text


def analyze_blood_report(text: str, language: str = "en") -> dict:
    cleaned = clean_text(text)
    score = 20
    lowered = cleaned.lower()

    for marker in ["low", "high", "deficient", "positive", "critical", "abnormal"]:
        if marker in lowered:
            score += 12

    score = clamp_score(score)
    hindi = language == "hi"

    return {
        "riskPercentage": score,
        "riskBand": risk_band(score),
        "summary": "रिपोर्ट में clinical review की जरूरत वाले संकेत हो सकते हैं।" if hindi else "The report may contain signals that need clinical review.",
        "prevention": "संतुलित भोजन, hydration, sleep और follow-up testing रखें।" if hindi else "Maintain diet, hydration, sleep, and follow-up testing.",
        "cure": "इलाज diagnosis पर निर्भर करता है; doctor से review कराएं।" if hindi else "Treatment depends on diagnosis; review with a clinician.",
        "remedies": "Self-medication से बचें और symptoms track करें।" if hindi else "Avoid self-medication and track symptoms.",
        "cause": "Possible causes include deficiency, infection, inflammation, metabolic disease, or medicine effects.",
        "medicine": "Medicines should be selected by a qualified clinician after diagnosis.",
    }
