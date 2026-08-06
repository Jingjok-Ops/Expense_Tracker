CREATE DATABASE IF NOT EXISTS finflow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE finflow;

CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(32) NOT NULL DEFAULT '💼',
  color VARCHAR(32) NOT NULL DEFAULT '#ff8e3c',
  initialBalance DECIMAL(14,2) NOT NULL DEFAULT 0,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(80) PRIMARY KEY,
  type ENUM('income', 'expense', 'transfer') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  category VARCHAR(120) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  walletId VARCHAR(80) NULL,
  fromWalletId VARCHAR(80) NULL,
  toWalletId VARCHAR(80) NULL,
  createdAt BIGINT NOT NULL,
  updatedAt BIGINT NOT NULL,
  INDEX idx_transactions_date (date),
  INDEX idx_transactions_type (type),
  INDEX idx_transactions_wallet (walletId),
  INDEX idx_transactions_from_wallet (fromWalletId),
  INDEX idx_transactions_to_wallet (toWalletId)
);
