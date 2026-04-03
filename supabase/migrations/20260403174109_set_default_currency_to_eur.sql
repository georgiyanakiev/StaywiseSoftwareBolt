/*
  # Set default currency to EUR

  Updates all hotels that currently have USD as their currency to EUR.
  Also changes the column default to EUR for any new hotels created.
*/

UPDATE hotels SET currency = 'EUR' WHERE currency = 'USD' OR currency IS NULL;

ALTER TABLE hotels ALTER COLUMN currency SET DEFAULT 'EUR';
