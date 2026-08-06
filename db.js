const API_BASE_URL = window.FINFLOW_API_BASE_URL || '/api';
let db = null;

async function fetchJson(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        },
        ...options
    });

    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const data = await response.json();
            if (data && data.error) {
                errorMessage = data.error;
            }
        } catch (error) {
            // Ignore JSON parsing errors and use the generic message.
        }
        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

const initDB = async () => {
    const health = await fetchJson('/health');
    if (!health || !health.ok) {
        throw new Error('API health check failed');
    }

    db = {
        type: 'mysql-api',
        baseUrl: API_BASE_URL
    };

    return db;
};

const saveWalletDB = async (wallet) => {
    await fetchJson('/wallets', {
        method: 'POST',
        body: JSON.stringify(wallet)
    });
};

const getAllWalletsDB = async () => {
    return fetchJson('/wallets');
};

const deleteWalletDB = async (id) => {
    await fetchJson(`/wallets/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
};

const saveTransactionDB = async (tx) => {
    await fetchJson('/transactions', {
        method: 'POST',
        body: JSON.stringify(tx)
    });
};

const getAllTransactionsDB = async () => {
    return fetchJson('/transactions');
};

const deleteTransactionDB = async (id) => {
    await fetchJson(`/transactions/${encodeURIComponent(id)}`, {
        method: 'DELETE'
    });
};

const clearAllTransactionsDB = async () => {
    await fetchJson('/transactions', {
        method: 'DELETE'
    });
};

const clearAllWalletsDB = async () => {
    await fetchJson('/wallets', {
        method: 'DELETE'
    });
};
