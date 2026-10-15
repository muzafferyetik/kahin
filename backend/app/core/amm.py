from decimal import ROUND_HALF_UP, Decimal, localcontext


class PredictionAMM:
    """
    Sabit Çarpımlı (x * y = k) İkili Tahmin Piyasası Motoru.
    - 1 KP yatırım havuza girdiğinde 1 YES + 1 NO hissesi basılır (mint).
    - Çözümleme (Resolution) anında kazanan taraftaki 1 Hisse = 1.00 KP öder.

    Not: sqrt ve bölme işlemlerinde yuvarlama kaymasını önlemek için 50 haneli
    Decimal hassasiyeti kullanılır.
    """

    PREC = 50

    def __init__(self, yes_pool: Decimal, no_pool: Decimal):
        self.yes_pool = Decimal(str(yes_pool))
        self.no_pool = Decimal(str(no_pool))
        self.k = self.yes_pool * self.no_pool

    def get_probabilities(self) -> dict:
        total = self.yes_pool + self.no_pool
        # Evet havuzu ne kadar azalırsa (satın alınırsa), Evet ihtimali o kadar yükselir
        yes_prob = (self.no_pool / total) * Decimal("100")
        no_prob = (self.yes_pool / total) * Decimal("100")
        return {
            "yes_prob": yes_prob.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP),
            "no_prob": no_prob.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP),
        }

    def buy_shares(self, side: str, investment_kp: Decimal) -> dict:
        """Kullanıcı belirli bir KP yatırarak 'YES' veya 'NO' hissesi satın alır."""
        inv = Decimal(str(investment_kp))
        if inv <= Decimal("0"):
            raise ValueError("Yatırım miktarı 0'dan büyük olmalıdır.")
        if side not in ("YES", "NO"):
            raise ValueError("Geçersiz taraf. 'YES' veya 'NO' olmalı.")

        with localcontext() as ctx:
            ctx.prec = self.PREC
            entry_probs = self.get_probabilities()
            entry_prob = entry_probs["yes_prob"] if side == "YES" else entry_probs["no_prob"]

            if side == "YES":
                new_no_pool = self.no_pool + inv
                new_yes_pool = self.k / new_no_pool
                shares_received = (self.yes_pool + inv) - new_yes_pool
            else:
                new_yes_pool = self.yes_pool + inv
                new_no_pool = self.k / new_yes_pool
                shares_received = (self.no_pool + inv) - new_no_pool
            self.yes_pool, self.no_pool = new_yes_pool, new_no_pool

            new_probs = self.get_probabilities()
            return {
                "shares_received": shares_received.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                "entry_probability": entry_prob,
                "new_yes_pool": self.yes_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                "new_no_pool": self.no_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                "new_yes_prob": new_probs["yes_prob"],
                "new_no_prob": new_probs["no_prob"],
            }

    def sell_shares(self, side: str, shares_to_sell: Decimal) -> dict:
        """
        Kullanıcı elindeki hisseleri sonuçlanmadan önce havuza geri satar (Cash-Out).
        Matematiksel Kural: (Pool_Side + S - Payout) * (Pool_Other - Payout) = k
        İkinci dereceden denklemin kökü: Payout = ((Y + N) - sqrt((Y - N)^2 + 4k)) / 2
        """
        s = Decimal(str(shares_to_sell))
        if s <= Decimal("0"):
            raise ValueError("Satılacak hisse miktarı 0'dan büyük olmalıdır.")
        if side not in ("YES", "NO"):
            raise ValueError("Geçersiz taraf. 'YES' veya 'NO' olmalı.")

        with localcontext() as ctx:
            ctx.prec = self.PREC
            if side == "YES":
                y, n = self.yes_pool + s, self.no_pool
            else:
                y, n = self.yes_pool, self.no_pool + s
            discriminant = ((y - n) ** 2) + (Decimal("4") * self.k)
            payout_kp = ((y + n) - discriminant.sqrt()) / Decimal("2")
            self.yes_pool = y - payout_kp
            self.no_pool = n - payout_kp

            new_probs = self.get_probabilities()
            return {
                "payout_kp": payout_kp.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                "new_yes_pool": self.yes_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                "new_no_pool": self.no_pool.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP),
                "new_yes_prob": new_probs["yes_prob"],
                "new_no_prob": new_probs["no_prob"],
            }
