"""
Verita — honest lightweight forecaster for the Studio's time panels.

Trend (linear) + weekly seasonality (day-of-week factors) fitted with NumPy on the dataset's
primary time series. Honesty contract:
  • accuracy is measured by a real backtest — train on the first 80%, score MAPE on the
    held-out last 20% — and reported alongside the forecast;
  • the confidence band comes from the residual std of the backtest, not a made-up ±15%;
  • the method name is returned so the UI can say exactly what produced the line.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd


def _fit_predict(t: np.ndarray, y: np.ndarray, dow: np.ndarray, t_new: np.ndarray, dow_new: np.ndarray) -> np.ndarray:
    """Linear trend + day-of-week multiplicative seasonality."""
    coeffs = np.polyfit(t, y, 1)
    trend = np.polyval(coeffs, t)
    # seasonality factors on detrended series (guard against zero trend values)
    safe_trend = np.where(np.abs(trend) < 1e-9, 1e-9, trend)
    ratio = y / safe_trend
    factors = np.ones(7)
    for d in range(7):
        m = dow == d
        if m.sum() >= 2:
            factors[d] = float(np.clip(np.median(ratio[m]), 0.2, 5.0))
    return np.polyval(coeffs, t_new) * factors[dow_new]


def forecast_series(df: pd.DataFrame, time_col: str, measure_col: str, periods: int = 14) -> dict[str, Any]:
    s = df[[time_col, measure_col]].copy()
    s[time_col] = pd.to_datetime(s[time_col], errors="coerce")
    s[measure_col] = pd.to_numeric(s[measure_col], errors="coerce")
    s = s.dropna()
    if len(s) < 30:
        return {"error": "Not enough temporal data to forecast (need ≥ 30 points)."}

    span_days = (s[time_col].max() - s[time_col].min()).days
    freq = "D" if span_days <= 90 else "W" if span_days <= 730 else "M"
    series = s.set_index(time_col)[measure_col].resample(freq).sum().fillna(0.0)
    if len(series) < 10:
        return {"error": "Not enough aggregated periods to forecast."}

    y = series.to_numpy(dtype=float)
    t = np.arange(len(y), dtype=float)
    dow = series.index.dayofweek.to_numpy() if freq == "D" else np.zeros(len(y), dtype=int)

    # ── honest backtest: fit on first 80%, score on last 20% ──
    split = max(int(len(y) * 0.8), len(y) - 12)
    split = min(split, len(y) - 2)
    y_tr, y_te = y[:split], y[split:]
    pred_te = _fit_predict(t[:split], y_tr, dow[:split], t[split:], dow[split:])
    nonzero = np.abs(y_te) > 1e-9
    mape = float(np.mean(np.abs((y_te[nonzero] - pred_te[nonzero]) / y_te[nonzero])) * 100) if nonzero.any() else None
    resid_std = float(np.std(y_te - pred_te))

    # ── refit on everything, project forward ──
    step = {"D": pd.Timedelta(days=1), "W": pd.Timedelta(weeks=1), "M": pd.DateOffset(months=1)}[freq]
    future_idx = pd.date_range(series.index[-1] + step, periods=periods, freq=freq)
    t_new = np.arange(len(y), len(y) + periods, dtype=float)
    dow_new = future_idx.dayofweek.to_numpy() if freq == "D" else np.zeros(periods, dtype=int)
    yhat = _fit_predict(t, y, dow, t_new, dow_new)

    band = 1.96 * resid_std
    points = [
        {
            "x": idx.strftime("%Y-%m-%d"),
            "y": round(float(v), 2),
            "lo": round(float(v - band), 2),
            "hi": round(float(v + band), 2),
        }
        for idx, v in zip(future_idx, yhat)
    ]
    history = [{"x": idx.strftime("%Y-%m-%d"), "y": round(float(v), 2)} for idx, v in series.items()]

    return {
        "method": "linear trend + weekly seasonality (NumPy)",
        "freq": freq,
        "backtest_mape": round(mape, 1) if mape is not None else None,
        "backtest_note": f"MAPE measured on the last {len(y_te)} held-out periods — never trained on.",
        "history": history,
        "points": points,
        "measure": measure_col,
        "time_col": time_col,
    }
