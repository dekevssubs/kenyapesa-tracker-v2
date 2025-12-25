# 🇰🇪 Kenya Personal Finance / Expense Tracker – Developer Reference

This document is a **single source of truth** for building a Kenyan-focused personal finance & expense-tracking application with **mobile money + bank support**, **SMS auto-import**, and **merchant auto-tagging**.

---

## 1️⃣ SUPPORTED PAYMENT PROVIDERS

### Mobile Money

* Safaricom **M-PESA**
* **Airtel Money**
* **T-Kash** (Telkom)

### Banks (SMS-based)

* Equity Bank
* KCB Bank
* Cooperative Bank
* NCBA
* Absa
* Stanbic
* Standard Chartered

---

## 2️⃣ MOBILE MONEY FEES (KENYA)

### A. M-PESA – Send Money / Paybill / Till

| Min (KES) | Max (KES) | Fee (KES) |
| --------- | --------- | --------- |
| 1         | 100       | 0         |
| 101       | 500       | 7         |
| 501       | 1,000     | 13        |
| 1,001     | 1,500     | 23        |
| 1,501     | 2,500     | 33        |
| 2,501     | 3,500     | 53        |
| 3,501     | 5,000     | 57        |
| 5,001     | 7,500     | 78        |
| 7,501     | 10,000    | 90        |
| 10,001    | 15,000    | 100       |
| 15,001    | 20,000    | 105       |
| 20,001    | 250,000   | 108       |

> Applies to **P2P transfers, Paybill & Buy Goods (Till)** unless merchant absorbs cost.

---

### B. M-PESA Withdrawals (Agent)

| Min    | Max    | Fee |
| ------ | ------ | --- |
| 50     | 100    | 11  |
| 101    | 500    | 27  |
| 501    | 1,000  | 28  |
| 1,001  | 2,500  | 29  |
| 2,501  | 3,500  | 52  |
| 3,501  | 5,000  | 69  |
| 5,001  | 7,500  | 87  |
| 7,501  | 10,000 | 115 |
| 10,001 | 20,000 | 167 |
| 20,001 | 35,000 | 185 |
| 35,001 | 50,000 | 197 |

---

### C. Airtel Money Transfers

| Min    | Max     | Fee |
| ------ | ------- | --- |
| 1      | 100     | 0   |
| 101    | 500     | 11  |
| 501    | 1,000   | 20  |
| 1,001  | 1,500   | 30  |
| 1,501  | 2,500   | 30  |
| 2,501  | 3,500   | 50  |
| 3,501  | 5,000   | 50  |
| 5,001  | 7,500   | 70  |
| 7,501  | 10,000  | 80  |
| 10,001 | 20,000  | 95  |
| 20,001 | 50,000  | 105 |
| 50,001 | 250,000 | 105 |

> **Within Airtel transfers are usually free**.

---

## 3️⃣ BANK TRANSACTION FEES (SUMMARY)

### Bank → Mobile Money

| Amount (KES)     | Typical Fee |
| ---------------- | ----------- |
| 1 – 100          | 0           |
| 101 – 500        | 10 – 11     |
| 501 – 1,000      | 12 – 15     |
| 1,001 – 2,500    | 20 – 25     |
| 2,501 – 5,000    | 35 – 45     |
| 5,001 – 10,000   | 55          |
| 10,001 – 20,000  | 65 – 76     |
| 20,001 – 150,000 | ~78         |

---

### ATM Withdrawals

| ATM Type   | Fee      |
| ---------- | -------- |
| Own Bank   | 30 – 45  |
| Other Bank | 45 – 100 |

---

## 4️⃣ SMS AUTO-IMPORT ARCHITECTURE

```
SMS Listener → Parser Engine → Normalizer → DB
```

### Supported Senders

* `MPESA`
* `AirtelMoney`
* Bank sender IDs

---

## 5️⃣ REAL SMS PATTERNS (KENYA)

### M-PESA Send Money

```
QKF7D8H92 Confirmed. You have sent Ksh2,500.00 to John Doe 0712345678
Transaction cost Ksh33.00.
```

### M-PESA Paybill

```
RKP2D8F Confirmed. Ksh1,250.00 sent to KPLC Prepaid for account 12345678
Transaction cost Ksh23.00.
```

### Bank SMS Example (Equity)

```
EQ Bank: Ksh4,250.00 paid to Naivas Supermarket.
Ref EFG2390. Charges Ksh45.00.
```

---

## 6️⃣ CORE REGEX PATTERNS

```regex
Reference ID: ^[A-Z0-9]{6,12}
Amount: (Ksh|KES)\s?([\d,]+)
Fee: (Fee|Charges|Transaction cost)\s?(Ksh|KES)\s?([\d,]+)
Merchant: (to|paid to|at)\s(.+?)\b
```

---

## 7️⃣ MERCHANT AUTO-TAGGING ENGINE

### Merchant Dictionary (Example)

```json
{
  "KPLC": "Utilities",
  "NAIVAS": "Groceries",
  "CARREFOUR": "Groceries",
  "UBER": "Transport",
  "BOLT": "Transport",
  "DSTV": "Entertainment",
  "NETFLIX": "Entertainment",
  "SAFARICOM": "Telecom"
}
```

### Normalization Logic

```js
merchant
 .toUpperCase()
 .replace(/AGENT\s?\d+/g, "")
 .replace(/-.*$/, "")
 .trim();
```

---

## 8️⃣ TRANSACTION CLASSIFICATION RULES

| Condition         | Type       |
| ----------------- | ---------- |
| "sent to" + phone | TRANSFER   |
| "paid to"         | BUY_GOODS  |
| "account"         | PAYBILL    |
| "withdrawn"       | WITHDRAWAL |
| "received"        | INCOME     |

---

## 9️⃣ NORMALIZED TRANSACTION OBJECT

```json
{
  "id": "uuid",
  "provider": "MPESA",
  "institution": "Safaricom",
  "ref_id": "QKF7D8H92",
  "amount": 2500,
  "fee": 33,
  "total": 2533,
  "merchant": "KPLC",
  "category": "Utilities",
  "transaction_type": "PAYBILL",
  "direction": "DEBIT",
  "timestamp": "2025-01-01T16:10:00",
  "raw_sms": "..."
}
```

---

## 🔐 10️⃣ PRIVACY & COMPLIANCE

* On-device SMS parsing
* Explicit user consent
* Manual approval before save
* Raw SMS deletion option
* No SMS upload without opt-in

---

## 💡 11️⃣ INSIGHTS ENABLED

* Monthly transaction fees spent
* Bank vs Mobile Money comparison
* Recurring bills detection
* Cost optimization suggestions

---





