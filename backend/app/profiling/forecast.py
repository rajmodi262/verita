"""
Verita — forecast tournament for the Studio's time panels.

Three candidate models compete; each is fit on the first 80% of the series and scored by MAPE
on the held-out last 20%. The lowest-MAPE model is selected to produce the forward forecast, and
**every** model's backtest score is returned so the choice is transparent and defensible.

Models:
  • linear+seasonality — linear trend × day-of-week multiplicative factors
  • holt           — Holt's double exponential smoothing (level + trend)
  • seasonal_naive — last-season-carried-forward (a serious baseline; if it wins, the data has
                     little learnable structure, which is itself an honest finding)

Confidence band = ±1.96 × residual std of the winning model on the holdout (not a made-up ±15%).
"""

from __future__ import annotations

from typing import Any, Callable

import numpy as np
import pandas as pd


# ── candidate models: each returns a predictor f(t_new, dow_new) -> np.ndarray ──

def _fit_linear_seasonal(t, y, dow) -> Callable:
    coeffs = np.polyfit(t, y, 1)
    trend = np.polyval(coeffs, t)
    safe = np.where(np.abs(trend) < 1e-9, 1e-9, trend)
    ratio = y / safe
    factors = np.ones(7)
    for d in range(7):
        m = dow == d
        if m.sum() >= 2:
            factors[d] = float(np.clip(np.median(ratio[m]), 0.2, 5.0))
    return lambda t_new, dow_new: np.polyval(coeffs, t_new) * factors[dow_new]


def _fit_holt(t, y, dow, alpha=0.5, beta=0.3) -> Callable:
    level, trend = float(y[0]), float(y[1] - y[0]) if len(y) > 1 else 0.0
    for i in range(1, len(y)):
        prev_level = level
        level = alpha * y[i] + (1 - alpha) * (level + trend)
        trend = beta * (level - prev_level) + (1 - beta) * trend
    last_t = t[-1]
    return lambda t_new, dow_new: level + trend * (np.asarray(t_new) - last_t)


def _fit_seasonal_naive(t, y, dow, season=7) -> Callable:
    season = season if len(y) >= season else 1
    tail = y[-season:]
    base = len(y)
    return lambda t_new, dow_new: np.array([tail[(int(tn) - base) % season] for tn in np.atleast_1d(t_new)])


_MODELS: dict[str, Callable] = {
    "linear+seasonality": _fit_linear_seasonal,
    "holt": _fit_holt,
    "seasonal_naive": _fit_seasonal_naive,
}


def _mape(actual: np.ndarray, pred: np.ndarray) -> float | None:
    nz = np.abs(actual) > 1e-9
    return float(np.mean(np.abs((actual[nz] - pred[nz]) / actual[nz])) * 100) if nz.any() else None


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

    split = min(max(int(len(y) * 0.8), len(y) - 12), len(y) - 2)
    t_tr, y_tr, dow_tr = t[:split], y[:split], dow[:split]
    t_te, y_te, dow_te = t[split:], y[split:], dow[split:]

    # ── tournament: score every model on the holdout ──
    scores: list[dict[str, Any]] = []
    for name, fit in _MODELS.items():
        try:
            pred = fit(t_tr, y_tr, dow_tr)(t_te, dow_te)
            mape = _mape(y_te, np.asarray(pred, dtype=float))
            scores.append({"model": name, "mape": round(mape, 1) if mape is not None else None})
        except Exception:
            scores.append({"model": name, "mape": None})

    valid = [s for s in scores if s["mape"] is not None]
    winner = min(valid, key=lambda s: s["mape"])["model"] if valid else "linear+seasonality"
    scores.sort(key=lambda s: (s["mape"] is None, s["mape"] if s["mape"] is not None else 1e9))

    # ── refit winner on full series, project forward, band from its holdout residuals ──
    fit = _MODELS[winner]
    resid = y_te - np.asarray(fit(t_tr, y_tr, dow_tr)(t_te, dow_te), dtype=float)
    band = 1.96 * float(np.std(resid))

    step = {"D": pd.Timedelta(days=1), "W": pd.Timedelta(weeks=1), "M": pd.DateOffset(months=1)}[freq]
    future_idx = pd.date_range(series.index[-1] + step, periods=periods, freq=freq)
    t_new = np.arange(len(y), len(y) + periods, dtype=float)
    dow_new = future_idx.dayofweek.to_numpy() if freq == "D" else np.zeros(periods, dtype=int)
    yhat = np.asarray(fit(t, y, dow)(t_new, dow_new), dtype=float)

    points = [
        {"x": idx.strftime("%Y-%m-%d"), "y": round(float(v), 2), "lo": round(float(v - band), 2), "hi": round(float(v + band), 2)}
        for idx, v in zip(future_idx, yhat)
    ]
    history = [{"x": idx.strftime("%Y-%m-%d"), "y": round(float(v), 2)} for idx, v in series.items()]
    winning_mape = next((s["mape"] for s in scores if s["model"] == winner), None)

    return {
        "method": winner,
        "freq": freq,
        "backtest_mape": winning_mape,
        "tournament": scores,  # every model's holdout MAPE, ranked
        "backtest_note": f"3 models backtested on the last {len(y_te)} held-out periods; '{winner}' won.",
        "history": history,
        "points": points,
        "measure": measure_col,
        "time_col": time_col,
    }
