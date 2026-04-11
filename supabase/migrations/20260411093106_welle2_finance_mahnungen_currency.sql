-- ============================================================================
-- Welle 2 — finance_mahnungen multi-currency support
-- ============================================================================
-- Patch direkt nach welle2_treasury_foundation: Carolyn Chandler ist 779,85 USD,
-- amount_eur impliziert EUR-only. Tabelle ist leer, Rename ist risk-free.
-- Ohne dieses Patch könnten USD-Mahnungen nicht ohne FX-Schätzung geseeded werden.
-- ============================================================================

ALTER TABLE finance_mahnungen RENAME COLUMN amount_eur TO amount;
ALTER TABLE finance_mahnungen RENAME COLUMN mahngebuehren_eur TO mahngebuehren;
ALTER TABLE finance_mahnungen ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'EUR';
