from decimal import Decimal

import pytest

from app.core.amm import PredictionAMM

D = Decimal


def test_initial_probabilities_are_50_50():
    amm = PredictionAMM(D("1000"), D("1000"))
    assert amm.get_probabilities() == {"yes_prob": D("50.0"), "no_prob": D("50.0")}


def test_buy_matches_api_spec_example():
    """API_SPEC.md: 1000/1000 havuza 250 KP YES -> 450 hisse, 800/1250, %61.0"""
    amm = PredictionAMM(D("1000"), D("1000"))
    r = amm.buy_shares("YES", D("250"))
    assert r["shares_received"] == D("450.0000")
    assert r["entry_probability"] == D("50.0")
    assert r["new_yes_pool"] == D("800.0000")
    assert r["new_no_pool"] == D("1250.0000")
    assert r["new_yes_prob"] == D("61.0")
    assert r["new_no_prob"] == D("39.0")


def test_buy_no_side_is_symmetric():
    amm = PredictionAMM(D("1000"), D("1000"))
    r = amm.buy_shares("NO", D("250"))
    assert r["shares_received"] == D("450.0000")
    assert r["new_no_pool"] == D("800.0000")
    assert r["new_yes_pool"] == D("1250.0000")
    assert r["new_no_prob"] == D("61.0")


def test_sell_matches_formula():
    """Havuz 800/1250, 200 YES satışı: formülden ≈117.22 KP (API_SPEC'teki 115.83 hatalıydı)."""
    amm = PredictionAMM(D("800"), D("1250"))
    r = amm.sell_shares("YES", D("200"))
    assert r["payout_kp"] == D("117.22")
    assert r["new_yes_pool"] == D("882.7800") or abs(r["new_yes_pool"] - D("882.78")) < D("0.01")
    assert abs(r["new_no_pool"] - D("1132.78")) < D("0.01")


def test_k_is_preserved_after_buy_and_sell():
    amm = PredictionAMM(D("1000"), D("1000"))
    k0 = amm.k
    amm.buy_shares("YES", D("137.37"))
    assert abs(amm.yes_pool * amm.no_pool - k0) < D("1e-30")
    amm.sell_shares("YES", D("50"))
    assert abs(amm.yes_pool * amm.no_pool - k0) < D("1e-30")


@pytest.mark.parametrize("side", ["YES", "NO"])
@pytest.mark.parametrize("amount", ["1", "10.55", "250", "5000"])
def test_buy_then_sell_all_is_reversible(side, amount):
    amm = PredictionAMM(D("1000"), D("1000"))
    bought = amm.buy_shares(side, D(amount))
    sold = amm.sell_shares(side, bought["shares_received"])
    # Alınan hisselerin tamamını satınca yatırılan KP geri gelmeli (yuvarlama toleransı)
    assert abs(sold["payout_kp"] - D(amount)) <= D("0.01")
    assert abs(amm.yes_pool - D("1000")) < D("0.01")
    assert abs(amm.no_pool - D("1000")) < D("0.01")


def test_buying_pushes_probability_up():
    amm = PredictionAMM(D("1000"), D("1000"))
    before = amm.get_probabilities()["yes_prob"]
    amm.buy_shares("YES", D("100"))
    assert amm.get_probabilities()["yes_prob"] > before


@pytest.mark.parametrize("bad", ["0", "-5"])
def test_non_positive_amounts_rejected(bad):
    amm = PredictionAMM(D("1000"), D("1000"))
    with pytest.raises(ValueError):
        amm.buy_shares("YES", D(bad))
    with pytest.raises(ValueError):
        amm.sell_shares("YES", D(bad))


def test_invalid_side_rejected():
    amm = PredictionAMM(D("1000"), D("1000"))
    with pytest.raises(ValueError):
        amm.buy_shares("MAYBE", D("10"))
    with pytest.raises(ValueError):
        amm.sell_shares("MAYBE", D("10"))
