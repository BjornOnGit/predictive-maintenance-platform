"""Synthetic training data for the failure model.

There is no real fleet data in this project, so failures are simulated from
three machine populations (healthy / degrading / failing). Failure odds rise
with vibration, temperature, pressure and runtime, plus noise so the model
cannot score 100%. Metrics therefore measure how well the model recovers this
simulated behaviour, not real-world accuracy.
"""
import numpy as np
import pandas as pd


def generate_dataset(n: int = 5000, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    group = rng.choice(3, size=n, p=[0.6, 0.25, 0.15])  # 0 healthy, 1 degrading, 2 failing

    def pick(healthy, degrading, failing):
        return np.select(
            [group == 0, group == 1],
            [rng.uniform(*healthy, n), rng.uniform(*degrading, n)],
            rng.uniform(*failing, n),
        )

    vibration = pick((0.8, 3.5), (3.0, 8.0), (6.0, 15.0))
    temperature = pick((38, 65), (55, 80), (70, 98))
    pressure = pick((3.3, 4.4), (4.0, 5.6), (5.0, 7.2))
    runtime_hours = rng.uniform(500, 12000, n)

    logit = (
        -7.5
        + 0.50 * (vibration - 2)
        + 0.09 * (temperature - 50)
        + 0.90 * (pressure - 4)
        + 0.00018 * runtime_hours
        + rng.normal(0, 0.8, n)
    )
    failed = (rng.random(n) < 1 / (1 + np.exp(-logit))).astype(int)

    return pd.DataFrame({
        "vibration": vibration.round(2),
        "temperature": temperature.round(1),
        "pressure": pressure.round(2),
        "runtime_hours": runtime_hours.round(0),
        "failed": failed,
    })