require('dotenv').config();

const express = require('express');
const path = require('path');
const { pingDatabase, query } = require('./db');

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, '..')));

function nowMs() {
  return Date.now();
}

function normalizeWallet(wallet) {
  return {
    dmid: wallet.id,
    name: wallet.name,
    icon: wallet.icon || '💼',
    color: wallet.color || '#ff8e3c',
    initialBalance: Number(wallet.initialBalance || 0),
    createdAt: wallet.createdAt || nowMs(),
    updatedAt: wallet.updatedAt || nowMs()
  };
}

function normalizeTransaction(tx) {
  return {
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount || 0),
    category: tx.category,
    date: tx.date,
    note: tx.note || '',
    walletId: tx.walletId || null,
    fromWalletId: tx.fromWalletId || null,
    toWalletId: tx.toWalletId || null,
    createdAt: tx.createdAt || nowMs(),
    updatedAt: tx.updatedAt || nowMs()
  };
}

app.get('/api/health', async (req, res) => {
  try {
    await pingDatabase();
    res.json({ ok: true, database: 'mysql' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/wallets', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM wallets ORDER BY createdAt ASC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/wallets', async (req, res) => {
  try {
    const wallet = normalizeWallet(req.body || {});
    if (!wallet.id || !wallet.name) {
      return res.status(400).json({ error: 'wallet id and name are required' });
    }

    const sql = `
      INSERT INTO wallets (id, name, icon, color, initialBalance, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        icon = VALUES(icon),
        color = VALUES(color),
        initialBalance = VALUES(initialBalance),
        updatedAt = VALUES(updatedAt)
    `;
    await query(sql, [wallet.id, wallet.name, wallet.icon, wallet.color, wallet.initialBalance, wallet.createdAt, wallet.updatedAt]);
    res.status(201).json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/wallets/:id', async (req, res) => {
  try {
    const wallet = normalizeWallet({ ...req.body, id: req.params.id, updatedAt: nowMs() });
    const sql = `
      UPDATE wallets
      SET name = ?, icon = ?, color = ?, initialBalance = ?, updatedAt = ?
      WHERE id = ?
    `;
    const result = await query(sql, [wallet.name, wallet.icon, wallet.color, wallet.initialBalance, wallet.updatedAt, wallet.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'wallet not found' });
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/wallets/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM wallets WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'wallet not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/wallets', async (req, res) => {
  try {
    await query('DELETE FROM wallets');
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/transactions', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM transactions ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const tx = normalizeTransaction(req.body || {});
    if (!tx.id || !tx.type || !tx.category || !tx.date) {
      return res.status(400).json({ error: 'transaction id, type, category and date are required' });
    }

    const sql = `
      INSERT INTO transactions
        (id, type, amount, category, date, note, walletId, fromWalletId, toWalletId, createdAt, updatedAt)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        type = VALUES(type),
        amount = VALUES(amount),
        category = VALUES(category),
        date = VALUES(date),
        note = VALUES(note),
        walletId = VALUES(walletId),
        fromWalletId = VALUES(fromWalletId),
        toWalletId = VALUES(toWalletId),
        updatedAt = VALUES(updatedAt)
    `;

    await query(sql, [
      tx.id,
      tx.type,
      tx.amount,
      tx.category,
      tx.date,
      tx.note,
      tx.walletId,
      tx.fromWalletId,
      tx.toWalletId,
      tx.createdAt,
      tx.updatedAt
    ]);

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/transactions/:id', async (req, res) => {
  try {
    const tx = normalizeTransaction({ ...req.body, id: req.params.id, updatedAt: nowMs() });
    const sql = `
      UPDATE transactions
      SET type = ?, amount = ?, category = ?, date = ?, note = ?, walletId = ?, fromWalletId = ?, toWalletId = ?, updatedAt = ?
      WHERE id = ?
    `;
    const result = await query(sql, [
      tx.type,
      tx.amount,
      tx.category,
      tx.date,
      tx.note,
      tx.walletId,
      tx.fromWalletId,
      tx.toWalletId,
      tx.updatedAt,
      tx.id
    ]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'transaction not found' });
    }
    res.json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'transaction not found' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/transactions', async (req, res) => {
  try {
    await query('DELETE FROM transactions');
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(port, () => {
  console.log(`FinFlow server running on http://localhost:${port}`);
});
