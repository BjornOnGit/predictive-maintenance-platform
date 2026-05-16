import pandas as pd
import pickle
import os
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_PATH = os.path.join(SCRIPT_DIR, "training_data.csv")
MODEL_PATH = os.path.join(SCRIPT_DIR, "models", "failure_model.pkl")


def train_failure_model():
    """Train RandomForestClassifier on historical data"""
    
    print("Loading training data...")
    df = pd.read_csv(CSV_PATH)
    print(f"✓ Loaded {len(df)} samples")
    
    # Features and target
    X = df[["vibration", "temperature", "pressure", "runtime_hours"]]
    y = df["failed"]
    
    print(f"  Features: {list(X.columns)}")
    print(f"  Target: {list(y.unique())}")
    
    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    print("\nTraining RandomForestClassifier...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    print("✓ Training complete")
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\nAccuracy: {accuracy:.2%}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["Normal", "Failure"]))
    
    # Save model
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model, f)
    print(f"✓ Model saved to {MODEL_PATH}")
    
    return model


if __name__ == "__main__":
    train_failure_model()
