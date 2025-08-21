-- Migration: Add CHECK constraints for currency and language fields
-- This ensures database-level validation matches the application-level Zod validation
-- 
-- Note: These values should match the constants defined in lib/constants.ts
-- If you update the constants file, you'll need to update this migration as well

-- Add CHECK constraint for currency field and enforce presence
ALTER TABLE users ADD CONSTRAINT users_currency_check 
CHECK (currency IS NOT NULL AND currency IN (
  'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR', 'BRL',
  'KRW', 'MXN', 'SGD', 'HKD', 'NOK', 'SEK', 'DKK', 'PLN', 'CZK', 'HUF',
  'RUB', 'TRY', 'ZAR', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'BDT', 'PKR'
));

-- Add CHECK constraint for language field and enforce presence
ALTER TABLE users ADD CONSTRAINT users_language_check 
CHECK (language IS NOT NULL AND language IN (
  'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh',
  'ar', 'hi', 'bn', 'ur', 'fa', 'tr', 'nl', 'sv', 'da', 'no',
  'fi', 'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl', 'et',
  'lv', 'lt', 'mt', 'el', 'he', 'th', 'vi', 'id', 'ms', 'tl'
));

-- Add comments explaining the constraints
COMMENT ON CONSTRAINT users_currency_check ON users IS 'Ensures currency is a supported ISO currency code';
COMMENT ON CONSTRAINT users_language_check ON users IS 'Ensures language is a supported ISO 639-1 locale';
