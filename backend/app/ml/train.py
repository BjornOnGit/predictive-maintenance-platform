import json
import os
import pickle

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

from app.ml.generate_data import generate_dataset

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "models")
MODEL_PATH = os.path.join(MODEL_DIR, "failure_model.pkl")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")
FEATURES = ["vibration", "temperature", "pressure", "runtime_hours"]


def train_failure_model():
    """Train RandomForestClassifier on the synthetic dataset; save model and metrics"""
    df = generate_dataset()
    X, y = df[FEATURES], df["failed"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1,
        class_weight="balanced",
    )
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    y_pred = (proba >= 0.5).astype(int)
    metrics = {
        "samples": len(df),
        "failure_rate": round(float(y.mean()), 4),
        "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "precision": round(float(precision_score(y_test, y_pred)), 4),
        "recall": round(float(recall_score(y_test, y_pred)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, proba)), 4),
    }

    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))
    return model


if __name__ == "__main__":
    train_failure_model()