from model.predictor import clamp_score, risk_band
from model.preprocessor import normalize_name


HIGH_RISK_PAIRS = {
    tuple(sorted(["warfarin", "ibuprofen"])): "Bleeding risk can increase when warfarin is combined with ibuprofen.",
    tuple(sorted(["clonidine", "propranolol"])): "Sudden clonidine withdrawal with propranolol can cause rebound hypertension.",
}


def analyze_drug_risk(drugs: list[str], conditions: list[str] | None = None, age: int | None = None) -> dict:
    names = [normalize_name(item) for item in drugs]
    score = 20
    signals = []

    for left_index, left in enumerate(names):
        for right in names[left_index + 1 :]:
            description = HIGH_RISK_PAIRS.get(tuple(sorted([left, right])))
            if description:
                score += 45
                signals.append(description)

    if age and age >= 65:
        score += 8
    if conditions:
        score += min(12, len(conditions) * 4)

    score = clamp_score(score)
    return {"riskPercentage": score, "riskBand": risk_band(score), "signals": signals}
