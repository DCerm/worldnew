ALTER TABLE membership_plans
  ALTER COLUMN currency_code SET DEFAULT 'GBP';

ALTER TABLE user_subscriptions
  ALTER COLUMN currency_code SET DEFAULT 'GBP';

UPDATE membership_plans
SET currency_code = 'GBP'
WHERE currency_code IS NULL
   OR currency_code = 'USD';

UPDATE user_subscriptions
SET currency_code = 'GBP'
WHERE currency_code IS NULL
   OR currency_code = 'USD';
