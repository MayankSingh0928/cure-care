from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Convert symptom CSV files into JSON documents for RAG ingestion.")
    parser.add_argument("--dataset", required=True, help="dataset.csv with Disease and Symptom columns.")
    parser.add_argument("--descriptions", default="", help="symptom_Description.csv path.")
    parser.add_argument("--precautions", default="", help="symptom_precaution.csv path.")
    parser.add_argument("--severity", default="", help="Symptom-severity.csv path.")
    parser.add_argument("--out", default="data/symptom_rag_documents.json", help="Output JSON path.")
    return parser.parse_args()


def norm(value: str) -> str:
    return str(value or "").replace("_", " ").strip()


def header_key(value: str) -> str:
    return "".join(char for char in value.lower() if char.isalnum())


def load_rows(path: str) -> list[dict[str, str]]:
    if not path:
        return []
    with open(path, "r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def first_matching(row: dict[str, str], names: list[str]) -> str:
    lookup = {header_key(key): key for key in row.keys()}
    for name in names:
        key = lookup.get(header_key(name))
        if key:
            return row.get(key, "")
    return ""


def main() -> None:
    args = parse_args()
    dataset_rows = load_rows(args.dataset)
    description_rows = load_rows(args.descriptions)
    precaution_rows = load_rows(args.precautions)
    severity_rows = load_rows(args.severity)

    descriptions = {
        norm(first_matching(row, ["Disease"])).lower(): norm(first_matching(row, ["Description"]))
        for row in description_rows
    }

    precautions: dict[str, list[str]] = {}
    for row in precaution_rows:
        disease = norm(first_matching(row, ["Disease"])).lower()
        values = [
            norm(value)
            for key, value in row.items()
            if header_key(key).startswith("precaution") and norm(value)
        ]
        if disease:
            precautions[disease] = values

    severities = {
        norm(first_matching(row, ["Symptom"])).lower(): norm(first_matching(row, ["weight", "severity"]))
        for row in severity_rows
    }

    disease_symptoms: dict[str, set[str]] = {}
    for row in dataset_rows:
        disease = norm(first_matching(row, ["Disease"]))
        symptoms = {
            norm(value)
            for key, value in row.items()
            if header_key(key).startswith("symptom") and norm(value)
        }
        if disease:
            disease_symptoms.setdefault(disease, set()).update(symptoms)

    docs = []
    for index, (disease, symptoms) in enumerate(sorted(disease_symptoms.items()), start=1):
        disease_key = disease.lower()
        symptom_text = ", ".join(sorted(symptoms))
        severity_text = ", ".join(
            f"{symptom}: {severities[symptom.lower()]}"
            for symptom in sorted(symptoms)
            if symptom.lower() in severities
        )
        precaution_text = "; ".join(precautions.get(disease_key, []))
        description = descriptions.get(disease_key, "")
        content = (
            f"Disease: {disease}. "
            f"Associated symptoms in the dataset: {symptom_text}. "
            f"Description: {description or 'No description provided.'} "
            f"Precautions listed in the dataset: {precaution_text or 'No precautions provided.'} "
            f"Symptom severity weights: {severity_text or 'No severity weights provided.'}"
        )
        docs.append(
            {
                "id": f"symptom-disease-{index}",
                "title": f"{disease} symptom profile",
                "source": "Local symptom CSV dataset",
                "content": content,
                "metadata": {
                    "disease": disease,
                    "symptoms": sorted(symptoms),
                    "source_type": "symptom_dataset",
                },
            }
        )

    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(docs, indent=2), encoding="utf-8")
    print(f"Saved {len(docs)} RAG documents to {output_path}")


if __name__ == "__main__":
    main()
