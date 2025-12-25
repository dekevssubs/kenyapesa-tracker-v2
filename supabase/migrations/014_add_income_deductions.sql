-- Migration: Add statutory_deductions and tax_amount columns to income table
-- Issue: Income service tries to save these values but columns don't exist
-- Date: 2024

-- Add statutory_deductions column (for NSSF, NHIF/SHIF, Housing Levy)
ALTER TABLE income
ADD COLUMN IF NOT EXISTS statutory_deductions DECIMAL(12, 2) DEFAULT 0 CHECK (statutory_deductions >= 0);

-- Add tax_amount column (for PAYE tax)
ALTER TABLE income
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(12, 2) DEFAULT 0 CHECK (tax_amount >= 0);

-- Add comments for documentation
COMMENT ON COLUMN income.statutory_deductions IS 'Total statutory deductions (NSSF + NHIF/SHIF + Housing Levy)';
COMMENT ON COLUMN income.tax_amount IS 'Income tax amount (PAYE)';
