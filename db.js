const DB_NAME = 'FinFlowDB';
const DB_VERSION = 1;
let db = null;

const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            
            if (!database.objectStoreNames.contains('wallets')) {
                database.createObjectStore('wallets', { keyPath: 'id' });
            }
            
            if (!database.objectStoreNames.contains('transactions')) {
                database.createObjectStore('transactions', { keyPath: 'id' });
            }
        };
    });
};

const saveWalletDB = (wallet) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['wallets'], 'readwrite');
        const store = transaction.objectStore('wallets');
        const request = store.put(wallet);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
};

const getAllWalletsDB = () => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['wallets'], 'readonly');
        const store = transaction.objectStore('wallets');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

const deleteWalletDB = (id) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['wallets'], 'readwrite');
        const store = transaction.objectStore('wallets');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
};

const saveTransactionDB = (tx) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');
        const request = store.put(tx);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
};

const getAllTransactionsDB = () => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (e) => reject(e.target.error);
    });
};

const deleteTransactionDB = (id) => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
};

const clearAllTransactionsDB = () => {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB not initialized');
        const transaction = db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
};
