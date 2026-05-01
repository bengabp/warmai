"""Pure-logic unit tests — no DB, no scheduler instance required."""

from types import SimpleNamespace

from app.scheduler import _next_send_volume


def _w(**kwargs):
    base = dict(
        increase_rate=0.5,
        start_volume=20,
        daily_send_limit=1000,
        current_warmup_day=0,
    )
    base.update(kwargs)
    return SimpleNamespace(**base)


def test_first_day_uses_start_volume():
    w = _w(current_warmup_day=0, start_volume=25)
    assert _next_send_volume(w, last_volume=None) == 25


def test_relative_increase_compounds():
    w = _w(current_warmup_day=2, start_volume=20, increase_rate=0.5, daily_send_limit=1000)
    # last=40 → 40 + 0.5*40 = 60
    assert _next_send_volume(w, last_volume=40) == 60


def test_absolute_increase_adds_flat():
    w = _w(current_warmup_day=2, increase_rate=10.0, daily_send_limit=1000)
    assert _next_send_volume(w, last_volume=50) == 60


def test_increase_capped_at_daily_limit():
    w = _w(current_warmup_day=2, increase_rate=10.0, daily_send_limit=55)
    assert _next_send_volume(w, last_volume=50) == 55
