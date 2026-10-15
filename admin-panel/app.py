import datetime
import os
import re
import unicodedata
from decimal import Decimal

import psycopg2
import psycopg2.extras
import requests
import streamlit as st

# Sayfa yapılandırması
st.set_page_config(
    page_title="Kahin Yönetici Paneli",
    page_icon="🔮",
    layout="wide",
)

# API ve Veritabanı Bağlantı Ayarları
API_URL = os.getenv("API_URL", "http://localhost:8001/api/v1")
if not (API_URL.startswith("http://") or API_URL.startswith("https://")):
    API_URL = f"http://{API_URL}"
API_URL = API_URL.rstrip("/")
DATABASE_URL = os.getenv("DATABASE_URL")
PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = os.getenv("POSTGRES_PORT", "5433")
PG_DB = os.getenv("POSTGRES_DB", "kahin")
PG_USER = os.getenv("POSTGRES_USER", "kahin")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "kahin")


def get_db():
    if DATABASE_URL:
        # asyncpg veya standart postgres url dönüşümü
        dsn = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        return psycopg2.connect(dsn, cursor_factory=psycopg2.extras.RealDictCursor)
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASS,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


_TR_MAP = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")


def slugify(title: str) -> str:
    s = title.translate(_TR_MAP)
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:255] or "soru"


# Başlık & Logo
st.title("🔮 KAHİN — Operasyon & Yönetici Paneli")
st.caption("Piyasa Açma, Acil Durum Kilidi ve Soru Sonuçlandırma (Resolution) Merkezi")

tab1, tab2, tab3 = st.tabs([
    "✨ Sekme 1: Yeni Soru Aç",
    "🔒 Sekme 2: Aktif Piyasalar & Kilit",
    "🏆 Sekme 3: Soru Sonuçlandırma",
])

# -------------------------------------------------------------
# SEKME 1: YENİ SORU AÇ
# -------------------------------------------------------------
with tab1:
    st.subheader("Yeni Bir Tahmin Piyasası Başlat")
    with st.form("create_market_form"):
        col1, col2 = st.columns(2)
        with col1:
            title = st.text_input(
                "Soru Başlığı",
                placeholder="Örn: Bu akşamki GS - FB derbisinde kırmızı kart çıkar mı?",
            )
            category = st.selectbox(
                "Kategori",
                ["FUTBOL", "MAGAZIN", "GUNDEM", "EKONOMI"],
                index=0,
            )
            initial_pool = st.number_input(
                "Başlangıç Havuzu (Her iki taraf için eşit KP)",
                min_value=100.0,
                max_value=10000.0,
                value=1000.0,
                step=100.0,
            )

        with col2:
            auto_slug = slugify(title) if title else ""
            slug = st.text_input("URL Kısaltması (Slug)", value=auto_slug)

            close_date = st.date_input("Kapanış Tarihi", datetime.date.today() + datetime.timedelta(days=3))
            close_time = st.time_input("Kapanış Saati", datetime.time(20, 0))

        resolution_criteria = st.text_area(
            "Çözümleme Kuralı (Resmi Kaynak ve EVET Kriteri)",
            placeholder="Örn: TFF veya beIN Sports resmi maç raporuna göre maç son düdüğü çalana kadar en az 1 kırmızı kart çıkarsa EVET sayılır.",
        )

        submitted = st.form_submit_button("🚀 Yayına Al (OPEN)", use_container_width=True)

        if submitted:
            if not title.strip() or not resolution_criteria.strip():
                st.error("Lütfen soru başlığı ve çözümleme kuralını eksiksiz doldurun.")
            else:
                closes_at = datetime.datetime.combine(close_date, close_time).replace(tzinfo=datetime.timezone.utc)
                final_slug = slugify(slug or title)

                try:
                    conn = get_db()
                    cur = conn.cursor()
                    pool = Decimal(str(initial_pool))
                    k_const = pool * pool

                    # Market ekle
                    cur.execute(
                        """
                        INSERT INTO markets (slug, title, category, resolution_criteria, yes_pool, no_pool, k_constant, status, closes_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, 'OPEN', %s)
                        RETURNING id;
                        """,
                        (final_slug, title, category, resolution_criteria, pool, pool, k_const, closes_at),
                    )
                    market_id = cur.fetchone()["id"]

                    # İlk fiyat geçmişi kaydı (%50 - %50)
                    cur.execute(
                        """
                        INSERT INTO market_price_history (market_id, yes_prob, no_prob, volume_kp)
                        VALUES (%s, 50.00, 50.00, 0.00);
                        """,
                        (market_id,),
                    )
                    conn.commit()
                    cur.close()
                    conn.close()

                    st.success(f"🎉 Soru başarıyla yayına alındı! Slug: /m/{final_slug}")
                except Exception as e:
                    st.error(f"Hata oluştu: {e}")

# -------------------------------------------------------------
# SEKME 2: AKTİF PİYASALAR & ACİL DURUM KİLİDİ
# -------------------------------------------------------------
with tab2:
    st.subheader("Yayındaki Sorular & Acil Durum Kontrolleri")
    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, slug, title, category, yes_pool, no_pool, volume_kp, status, closes_at, created_at
            FROM markets
            WHERE status IN ('OPEN', 'LOCKED')
            ORDER BY created_at DESC;
            """
        )
        markets = cur.fetchall()
        cur.close()
        conn.close()

        if not markets:
            st.info("Şu an açık veya kilitli piyasa bulunmuyor.")
        else:
            for m in markets:
                total_pool = m["yes_pool"] + m["no_pool"]
                yes_prob = round((m["no_pool"] / total_pool) * 100, 1)
                no_prob = round(100 - yes_prob, 1)

                with st.expander(f"[{m['category']}] {m['title']} (Durum: {m['status']})", expanded=True):
                    col_info, col_action = st.columns([3, 1])

                    with col_info:
                        st.write(f"**Oranlar:** 🟢 EVET %{yes_prob} | 🔴 HAYIR %{no_prob}")
                        st.write(f"**Hacim:** {m['volume_kp']} KP | **Kapanış:** {m['closes_at']}")
                        st.write(f"**Link:** `/m/{m['slug']}`")

                    with col_action:
                        if m["status"] == "OPEN":
                            if st.button("❄️ Erken Kilitle (Freeze)", key=f"lock_{m['id']}"):
                                c = get_db()
                                cur = c.cursor()
                                cur.execute("UPDATE markets SET status = 'LOCKED' WHERE id = %s", (m["id"],))
                                c.commit()
                                c.close()
                                st.rerun()

                        if st.button("⚠️ İptal Et & İade Dağıt", key=f"cancel_{m['id']}"):
                            c = get_db()
                            cur = c.cursor()
                            # İptal et: tüm kullanıcılara yatırdıkları KP'yi iade et
                            cur.execute(
                                """
                                SELECT user_id, total_invested_kp
                                FROM positions
                                WHERE market_id = %s AND total_invested_kp > 0;
                                """,
                                (m["id"],),
                            )
                            positions = cur.fetchall()

                            for p in positions:
                                cur.execute(
                                    "UPDATE users SET kp_balance = kp_balance + %s WHERE id = %s RETURNING kp_balance;",
                                    (p["total_invested_kp"], p["user_id"]),
                                )
                                new_bal = cur.fetchone()["kp_balance"]
                                cur.execute(
                                    """
                                    INSERT INTO ledger_entries (user_id, market_id, tx_type, amount, balance_after)
                                    VALUES (%s, %s, 'MARKET_REFUND', %s, %s);
                                    """,
                                    (p["user_id"], m["id"], p["total_invested_kp"], new_bal),
                                )

                            cur.execute("UPDATE positions SET shares = 0, total_invested_kp = 0 WHERE market_id = %s;", (m["id"],))
                            cur.execute("UPDATE markets SET status = 'CANCELLED', resolved_at = NOW() WHERE id = %s;", (m["id"],))
                            c.commit()
                            c.close()
                            st.warning(f"Soru iptal edildi ve {len(positions)} kullanıcıya iadeleri yapıldı.")
                            st.rerun()
    except Exception as e:
        st.error(f"Veritabanı hatası: {e}")

# -------------------------------------------------------------
# SEKME 3: SORU SONUÇLANDIRMA (RESOLUTION)
# -------------------------------------------------------------
with tab3:
    st.subheader("Sonucu Belli Olan Soruları Çözümle")
    st.caption("Resmi sonuca göre kazanan tarafı seçin. Sistem 1 Hisse = 1 KP ödemesini ve Keskinlik Skorunu anında dağıtır.")

    try:
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            """
            SELECT id, slug, title, category, status, closes_at, resolution_criteria
            FROM markets
            WHERE status IN ('OPEN', 'LOCKED')
            ORDER BY closes_at ASC;
            """
        )
        ready_markets = cur.fetchall()
        cur.close()
        conn.close()

        if not ready_markets:
            st.info("Çözümleme bekleyen soru bulunmuyor.")
        else:
            for rm in ready_markets:
                st.markdown(f"### {rm['title']}")
                st.info(f"**Çözümleme Kuralı:** {rm['resolution_criteria']}")

                c1, c2 = st.columns(2)
                with c1:
                    if st.button("✅ EVET KAZANDI", key=f"res_yes_{rm['id']}", use_container_width=True):
                        # Çözümleme fonksiyonunu çağır
                        c = get_db()
                        cur = c.cursor()

                        # EVET hissesi olanları çek
                        cur.execute(
                            """
                            SELECT id, user_id, shares, avg_entry_probability
                            FROM positions
                            WHERE market_id = %s AND side = 'YES' AND shares > 0;
                            """,
                            (rm["id"],),
                        )
                        winners = cur.fetchall()
                        total_payout = Decimal("0.00")

                        for w in winners:
                            payout = round(Decimal(str(w["shares"])), 2)
                            total_payout += payout

                            # Bakiye güncelle
                            cur.execute(
                                "UPDATE users SET kp_balance = kp_balance + %s WHERE id = %s RETURNING kp_balance;",
                                (payout, w["user_id"]),
                            )
                            new_bal = cur.fetchone()["kp_balance"]

                            # Ledger kaydı
                            cur.execute(
                                """
                                INSERT INTO ledger_entries (user_id, market_id, tx_type, amount, balance_after)
                                VALUES (%s, %s, 'MARKET_PAYOUT', %s, %s);
                                """,
                                (w["user_id"], rm["id"], payout, new_bal),
                            )

                            # Keskinlik Skoru: round((100 - avg_entry) * 0.5, 2)
                            acc_pts = round((Decimal("100") - Decimal(str(w["avg_entry_probability"]))) * Decimal("0.5"), 2)
                            if acc_pts > 0:
                                cur.execute(
                                    "UPDATE users SET accuracy_score = accuracy_score + %s WHERE id = %s;",
                                    (acc_pts, w["user_id"]),
                                )

                        # Hisseleri sıfırla ve marketi güncelle
                        cur.execute("UPDATE positions SET shares = 0, total_invested_kp = 0 WHERE market_id = %s;", (rm["id"],))
                        cur.execute("UPDATE markets SET status = 'RESOLVED_YES', resolved_at = NOW() WHERE id = %s;", (rm["id"],))
                        c.commit()
                        c.close()

                        st.success(f"🎉 EVET Kazandı! Toplam {len(winners)} kullanıcıya {total_payout} KP dağıtıldı.")
                        st.rerun()

                with c2:
                    if st.button("❌ HAYIR KAZANDI", key=f"res_no_{rm['id']}", use_container_width=True):
                        c = get_db()
                        cur = c.cursor()

                        # HAYIR hissesi olanları çek
                        cur.execute(
                            """
                            SELECT id, user_id, shares, avg_entry_probability
                            FROM positions
                            WHERE market_id = %s AND side = 'NO' AND shares > 0;
                            """,
                            (rm["id"],),
                        )
                        winners = cur.fetchall()
                        total_payout = Decimal("0.00")

                        for w in winners:
                            payout = round(Decimal(str(w["shares"])), 2)
                            total_payout += payout

                            cur.execute(
                                "UPDATE users SET kp_balance = kp_balance + %s WHERE id = %s RETURNING kp_balance;",
                                (payout, w["user_id"]),
                            )
                            new_bal = cur.fetchone()["kp_balance"]

                            cur.execute(
                                """
                                INSERT INTO ledger_entries (user_id, market_id, tx_type, amount, balance_after)
                                VALUES (%s, %s, 'MARKET_PAYOUT', %s, %s);
                                """,
                                (w["user_id"], rm["id"], payout, new_bal),
                            )

                            acc_pts = round((Decimal("100") - Decimal(str(w["avg_entry_probability"]))) * Decimal("0.5"), 2)
                            if acc_pts > 0:
                                cur.execute(
                                    "UPDATE users SET accuracy_score = accuracy_score + %s WHERE id = %s;",
                                    (acc_pts, w["user_id"]),
                                )

                        cur.execute("UPDATE positions SET shares = 0, total_invested_kp = 0 WHERE market_id = %s;", (rm["id"],))
                        cur.execute("UPDATE markets SET status = 'RESOLVED_NO', resolved_at = NOW() WHERE id = %s;", (rm["id"],))
                        c.commit()
                        c.close()

                        st.success(f"❌ HAYIR Kazandı! Toplam {len(winners)} kullanıcıya {total_payout} KP dağıtıldı.")
                        st.rerun()

                st.divider()

    except Exception as e:
        st.error(f"Veritabanı hatası: {e}")
