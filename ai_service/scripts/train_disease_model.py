from __future__ import annotations

import argparse
import csv
from pathlib import Path

import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train a symptom-to-disease classifier and save it as disease_model.pkl.")
    parser.add_argument("--csv", required=True, help="Path to dataset.csv with Disease and Symptom columns.")
    parser.add_argument("--target", default="Disease", help="Disease/label column. Default: Disease.")
    parser.add_argument("--out", default="model/disease_model.pkl", help="Output .pkl path.")
    return parser.parse_args()


def normalize_header(name: str) -> str:
    return "".join(char for char in name.lower() if char.isalnum())


def clean_symptom(value: str) -> str:
    return str(value or "").replace("_", " ").strip().lower()


def load_dataset(csv_path: Path, target: str) -> tuple[list[str], list[str]]:
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    if not rows:
        raise ValueError("CSV has no rows.")

    header_lookup = {normalize_header(column): column for column in rows[0].keys()}
    target_column = header_lookup.get(normalize_header(target))
    if not target_column:
        raise ValueError(f"Missing target column: {target}")

    symptom_columns = [
        column
        for column in rows[0].keys()
        if normalize_header(column).startswith("symptom") and column != target_column
    ]
    if not symptom_columns:
        raise ValueError("No symptom columns found. Expected columns like Symptom_1, Symptom_2, ...")

    texts: list[str] = []
    labels: list[str] = []
    for row in rows:
        symptoms = [clean_symptom(row.get(column, "")) for column in symptom_columns]
        text = " ".join(symptom for symptom in symptoms if symptom)
        label = str(row.get(target_column, "")).strip()
        if text and label:
            texts.append(text)
            labels.append(label)

    if not texts:
        raise ValueError("No valid symptom rows were found.")

    return texts, labels


def main() -> None:
    args = parse_args()
    texts, labels = load_dataset(Path(args.csv), args.target)

    can_stratify = min(labels.count(label) for label in set(labels)) >= 2
    x_train, x_test, y_train, y_test = train_test_split(
        texts,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels if can_stratify else None,
    )

    model = Pipeline(
        steps=[
            ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
            ("classifier", LogisticRegression(max_iter=2500, class_weight="balanced")),
        ]
    )
    model.fit(x_train, y_train)

    predictions = model.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)

    output_path = Path(args.out)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, output_path)

    print(f"Saved model: {output_path}")
    print(f"Diseases: {len(set(labels))}")
    print(f"Training rows: {len(texts)}")
    print(f"Accuracy: {accuracy:.3f}")


if __name__ == "__main__":
    main()
