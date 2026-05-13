"""Tests for the G$ Management feature (schemas, service, router)."""
import pytest
from pydantic import ValidationError

from app.schemas.g_item import GItemUpdate


# ─── Schema tests ─────────────────────────────────────────────────────────────

def test_gitem_update_accepts_valid_reasons():
    for code in ("QI", "FMEA_H_RISK", "OTHER"):
        body = GItemUpdate(reason=code)
        assert body.reason == code


def test_gitem_update_rejects_bad_reason():
    with pytest.raises(ValidationError):
        GItemUpdate(reason="BOGUS")


def test_gitem_update_allows_null_reason_and_remark():
    body = GItemUpdate(reason=None, remark=None)
    assert body.reason is None
    assert body.remark is None


def test_gitem_update_rejects_overly_long_remark():
    with pytest.raises(ValidationError):
        GItemUpdate(remark="x" * 1001)


def test_gitem_update_accepts_empty_string_remark():
    body = GItemUpdate(remark="")
    assert body.remark == ""
