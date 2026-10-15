from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LedgerEntry, User


class InsufficientBalance(Exception):
    pass


async def apply_kp_change(
    db: AsyncSession,
    user: User,
    amount: Decimal,
    tx_type: str,
    market_id: UUID | None = None,
) -> LedgerEntry:
    """
    Tüm KP hareketlerinin geçtiği TEK nokta. Çağıran, `user` satırını önceden
    SELECT ... FOR UPDATE ile kilitlemiş olmalıdır. Bakiyeyi günceller ve
    değiştirilemez bir ledger kaydı yazar (sum(ledger.amount) == kp_balance).
    """
    new_balance = user.kp_balance + amount
    if new_balance < 0:
        raise InsufficientBalance("Yetersiz KP bakiyesi.")
    user.kp_balance = new_balance
    entry = LedgerEntry(
        user_id=user.id,
        market_id=market_id,
        tx_type=tx_type,
        amount=amount,
        balance_after=new_balance,
    )
    db.add(entry)
    return entry
