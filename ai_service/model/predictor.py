def risk_band(score: int) -> str:
    if score >= 70:
        return "high"
    if score >= 40:
        return "moderate"
    return "low"


def clamp_score(value: int) -> int:
    return max(1, min(95, value))
