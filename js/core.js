// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================

const CATEGORIES = {
    expense: [
        { id: 'food', name: 'อาหาร & เครื่องดื่ม', icon: '🍔', color: '#ffbe0b' },
        { id: 'transport', name: 'การเดินทาง & รถยนต์', icon: '🚗', color: '#3a86c8' },
        { id: 'shopping', name: 'ช็อปปิ้ง', icon: '🛍️', color: '#ff007f' },
        { id: 'entertainment', name: 'ความบันเทิง', icon: '🎬', color: '#7209b7' },
        { id: 'utilities', name: 'บิล & ค่าใช้จ่ายในบ้าน', icon: '💡', color: '#f72585' },
        { id: 'other_expense', name: 'อื่นๆ (รายจ่าย)', icon: '🏷️', color: '#8ac926' }
    ],
    income: [
        { id: 'salary', name: 'เงินเดือน', icon: '💰', color: '#10b981' },
        { id: 'side_job', name: 'รายได้เสริม', icon: '📈', color: '#06d6a0' },
        { id: 'bonus', name: 'ของขวัญ / โบนัส', icon: '🎁', color: '#f77f00' },
        { id: 'other_income', name: 'อื่นๆ (รายรับ)', icon: '💸', color: '#38b000' }
    ]
};

// ==========================================
// STATE MANAGEMENT
// ==========================================

let state = {
    transactions: [],
    wallets: [],
    theme: 'dark',
    selectedWalletId: 'all'
};

// ==========================================
// DOM ELEMENTS
// ==========================================

const transactionForm = document.getElementById('transaction-form');
const amountInput = document.getElementById('amount');
const categorySelect = document.getElementById('category');
const dateInput = document.getElementById('date');
const noteInput = document.getElementById('note');
const amountError = document.getElementById('amount-error');
const editIdInput = document.getElementById('edit-id');
const formTitleEl = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');

const netBalanceEl = document.getElementById('net-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');

const transactionsList = document.getElementById('transactions-list');

const filterTypeSelect = document.getElementById('filter-type');
const searchNoteInput = document.getElementById('search-note');

const themeToggleBtn = document.getElementById('theme-toggle');
const exportBtn = document.getElementById('export-btn');
const importBtnTrigger = document.getElementById('import-btn-trigger');
const importFileInput = document.getElementById('import-file-input');
const toastEl = document.getElementById('toast');
const toastMessageEl = document.getElementById('toast-message');

// Mobile Premium PWA Navigation & View Elements
const tabHomeBtn = document.getElementById('tab-home');
const tabAddBtn = document.getElementById('tab-add');
const tabReportsBtn = document.getElementById('tab-reports');

const viewHome = document.getElementById('view-home');
const viewAdd = document.getElementById('view-add');
const viewReports = document.getElementById('view-reports');

// Mobile Premium Quick Date & Calendar Filter Elements
const btnDateToday = document.getElementById('btn-date-today');
const btnDateYesterday = document.getElementById('btn-date-yesterday');
const filterDateInput = document.getElementById('filter-date');
const resetDateBtn = document.getElementById('reset-date-btn');

// Multiple Wallets DOM Elements
const addWalletBtn = document.getElementById('add-wallet-btn');
const addWalletModal = document.getElementById('add-wallet-modal');
const closeWalletModalBtn = document.getElementById('close-wallet-modal-btn');
const walletForm = document.getElementById('wallet-form');
const walletNameInput = document.getElementById('wallet-name');
const walletBalanceInput = document.getElementById('wallet-balance');
const walletIconSelect = document.getElementById('wallet-icon');
const walletColorSelect = document.getElementById('wallet-color');
const walletsContainer = document.getElementById('wallets-container');

const singleWalletGroup = document.getElementById('single-wallet-group');
const transferWalletsGroup = document.getElementById('transfer-wallets-group');
const transactionWalletSelect = document.getElementById('transaction-wallet');
const transferFromWalletSelect = document.getElementById('transfer-from-wallet');
const transferToWalletSelect = document.getElementById('transfer-to-wallet');
const categoryGroup = document.getElementById('category-group');

// ==========================================
// APP INITIALIZATION
// ==========================================

async function initApp() {
    // 1. Load theme preference first
    state.theme = localStorage.getItem('finflow_theme');
    if (!state.theme) {
        const savedState = localStorage.getItem('finflow_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                state.theme = parsed.theme || 'dark';
            } catch (e) {
                state.theme = 'dark';
            }
        } else {
            state.theme = 'dark';
        }
    }
    
    // Set theme on startup
    document.documentElement.setAttribute('data-theme', state.theme || 'dark');
    updateThemeToggleIcons();

    // Default form date to today
    dateInput.value = getTodayDateString(0);

    // Initial populate of select options (defaults to expense)
    populateCategories('expense');

    // Attach Event Listeners
    setupEventListeners();

    // 2. Initialize database & load data
    const dbStatusText = document.getElementById('db-status-text');
    const dbStatusBadge = document.querySelector('.db-status-badge');

    try {
        await initDB();
        
        // Request persistent storage to prevent browser from auto-clearing database
        if (navigator.storage && navigator.storage.persist) {
            try {
                const isPersisted = await navigator.storage.persisted();
                if (!isPersisted) {
                    const granted = await navigator.storage.persist();
                    console.log(`IndexedDB Storage Persistence requested. Granted: ${granted}`);
                } else {
                    console.log('IndexedDB Storage is already persisted.');
                }
            } catch (err) {
                console.warn('Persistent storage request failed:', err);
            }
        }
        
        // Connection success UI
        if (dbStatusText && dbStatusBadge) {
            dbStatusText.textContent = 'เชื่อมต่อฐานข้อมูล IndexedDB สำเร็จ (ความจุสูง)';
            dbStatusBadge.style.color = 'var(--income)';
            dbStatusBadge.style.borderColor = 'rgba(0, 245, 212, 0.2)';
            dbStatusBadge.style.background = 'var(--income-glow)';
            const dot = dbStatusBadge.querySelector('.db-status-dot');
            if (dot) {
                dot.style.backgroundColor = 'var(--income)';
                dot.style.boxShadow = '0 0 8px var(--income)';
            }
        }

        // Fetch wallets or seed a default wallet if empty
        let dbWallets = [];
        try {
            dbWallets = await getAllWalletsDB();
            if (!dbWallets || dbWallets.length === 0) {
                const defaultWallet = {
                    id: 'default-wallet',
                    name: 'กระเป๋าเงินหลัก',
                    icon: '💼',
                    color: '#ff8e3c',
                    initialBalance: 0,
                    createdAt: Date.now()
                };
                await saveWalletDB(defaultWallet);
                dbWallets = [defaultWallet];
            }
            state.wallets = dbWallets;
        } catch (e) {
            console.error('Failed to load wallets from DB, using fallback:', e);
            state.wallets = [{
                id: 'default-wallet',
                name: 'กระเป๋าเงินหลัก',
                icon: '💼',
                color: '#ff8e3c',
                initialBalance: 0,
                createdAt: Date.now()
            }];
        }

        populateWalletsDropdowns();

        const dbTransactions = await getAllTransactionsDB();
        
        if (dbTransactions && dbTransactions.length > 0) {
            state.transactions = dbTransactions.map(tx => {
                if (!tx.walletId && tx.type !== 'transfer') {
                    tx.walletId = 'default-wallet';
                }
                return tx;
            });
        } else {
            // Check if there is data in localStorage to migrate
            const savedState = localStorage.getItem('finflow_state');
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    if (parsed.wallets && parsed.wallets.length > 0) {
                        state.wallets = parsed.wallets;
                        if (db) {
                            for (const w of parsed.wallets) {
                                await saveWalletDB(w);
                            }
                        }
                    }
                    if (parsed.transactions && parsed.transactions.length > 0) {
                        console.log('Migrating localStorage transactions to IndexedDB...');
                        for (const tx of parsed.transactions) {
                            if (!tx.walletId && tx.type !== 'transfer') {
                                tx.walletId = 'default-wallet';
                            }
                            await saveTransactionDB(tx);
                        }
                        state.transactions = parsed.transactions;
                        localStorage.removeItem('finflow_state');
                        showToast('📤 ย้ายข้อมูลไปฐานข้อมูลใหม่สำเร็จ!');
                    } else {
                        await setupMockData();
                    }
                } catch (e) {
                    console.error('Migration failed, loading mock data:', e);
                    await setupMockData();
                }
            } else {
                await setupMockData();
            }
        }
    } catch (error) {
        console.error('Database failed to initialize. Using localStorage fallback:', error);
        
        // Connection error UI
        if (dbStatusText && dbStatusBadge) {
            dbStatusText.textContent = 'การเชื่อมต่อฐานข้อมูลผิดพลาด! (ใช้ความจำเบราว์เซอร์แทน)';
            dbStatusBadge.classList.add('error');
        }

        // Fallback to localstorage
        const savedState = localStorage.getItem('finflow_state');
        if (savedState) {
            try {
                const parsed = JSON.parse(savedState);
                state.transactions = parsed.transactions || [];
                if (parsed.wallets && parsed.wallets.length > 0) {
                    state.wallets = parsed.wallets;
                } else {
                    state.wallets = [{
                        id: 'default-wallet',
                        name: 'กระเป๋าเงินหลัก',
                        icon: '💼',
                        color: '#ff8e3c',
                        initialBalance: 0,
                        createdAt: Date.now()
                    }];
                }
                state.transactions = state.transactions.map(tx => {
                    if (!tx.walletId && tx.type !== 'transfer') {
                        tx.walletId = 'default-wallet';
                    }
                    return tx;
                });
            } catch (e) {
                console.error('Error parsing localStorage state in fallback', e);
            }
        } else {
            state.wallets = [{
                id: 'default-wallet',
                name: 'กระเป๋าเงินหลัก',
                icon: '💼',
                color: '#ff8e3c',
                initialBalance: 0,
                createdAt: Date.now()
            }];
            state.transactions = [
                { id: 'mock-1', type: 'income', amount: 35000, category: 'salary', date: getTodayDateString(-2), note: 'เงินเดือนประจำเดือน', walletId: 'default-wallet' },
                { id: 'mock-2', type: 'expense', amount: 1200, category: 'food', date: getTodayDateString(-1), note: 'หมูกระทะปาร์ตี้', walletId: 'default-wallet' },
                { id: 'mock-3', type: 'expense', amount: 450, category: 'transport', date: getTodayDateString(0), note: 'เติมน้ำมันรถยนต์', walletId: 'default-wallet' }
            ];
            saveStateToStorage();
        }
        
        populateWalletsDropdowns();
    }

    // Perform initial render
    render();
}

async function setupMockData() {
    const mockData = [
        { id: 'mock-1', type: 'income', amount: 35000, category: 'salary', date: getTodayDateString(-2), note: 'เงินเดือนประจำเดือน' },
        { id: 'mock-2', type: 'expense', amount: 1200, category: 'food', date: getTodayDateString(-1), note: 'หมูกระทะปาร์ตี้' },
        { id: 'mock-3', type: 'expense', amount: 450, category: 'transport', date: getTodayDateString(0), note: 'เติมน้ำมันรถยนต์' }
    ];
    try {
        for (const tx of mockData) {
            await saveTransactionDB(tx);
        }
    } catch (e) {
        console.error('Failed to save mock data to IndexedDB', e);
    }
    state.transactions = mockData;
}

// Helper: Get formatted date offset from today
function getTodayDateString(offsetDays = 0) {
    const d = new Date();
    if (offsetDays !== 0) {
        d.setDate(d.getDate() + offsetDays);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Save state back to localStorage
function saveStateToStorage() {
    localStorage.setItem('finflow_state', JSON.stringify(state));
}

// ==========================================
// MULTIPLE WALLETS HELPER OPERATIONS
// ==========================================

function handleTransactionTypeChange(type) {
    if (type === 'transfer') {
        if (categoryGroup) categoryGroup.style.display = 'none';
        if (singleWalletGroup) singleWalletGroup.style.display = 'none';
        if (transferWalletsGroup) transferWalletsGroup.style.display = 'grid';
    } else {
        if (categoryGroup) categoryGroup.style.display = 'flex';
        if (singleWalletGroup) singleWalletGroup.style.display = 'flex';
        if (transferWalletsGroup) transferWalletsGroup.style.display = 'none';
        
        const label = document.getElementById('wallet-select-label');
        if (label) {
            label.innerHTML = type === 'income' ? 'เข้ากระเป๋าเงิน <span class="required">*</span>' : 'จ่ายจากกระเป๋าเงิน <span class="required">*</span>';
        }
        populateCategories(type);
    }
}

function populateWalletsDropdowns() {
    if (!transactionWalletSelect || !transferFromWalletSelect || !transferToWalletSelect) return;
    
    transactionWalletSelect.innerHTML = '';
    transferFromWalletSelect.innerHTML = '';
    transferToWalletSelect.innerHTML = '';
    
    // Populate the analytics active wallet dropdown
    const analyticsWalletSelect = document.getElementById('analytics-active-wallet-select');
    if (analyticsWalletSelect) {
        analyticsWalletSelect.innerHTML = '';
        const optAll = document.createElement('option');
        optAll.value = 'all';
        optAll.textContent = '💼 ทุกบัญชีรวมกัน';
        analyticsWalletSelect.appendChild(optAll);
        
        state.wallets.forEach(wallet => {
            const opt = document.createElement('option');
            opt.value = wallet.id;
            opt.textContent = `${wallet.icon} ${wallet.name}`;
            analyticsWalletSelect.appendChild(opt);
        });
        analyticsWalletSelect.value = state.selectedWalletId || 'all';
    }
    
    state.wallets.forEach(wallet => {
        // For single transaction wallet
        const opt1 = document.createElement('option');
        opt1.value = wallet.id;
        opt1.textContent = `${wallet.icon} ${wallet.name}`;
        transactionWalletSelect.appendChild(opt1);
        
        // For transfer from wallet
        const opt2 = document.createElement('option');
        opt2.value = wallet.id;
        opt2.textContent = `${wallet.icon} ${wallet.name}`;
        transferFromWalletSelect.appendChild(opt2);
        
        // For transfer to wallet
        const opt3 = document.createElement('option');
        opt3.value = wallet.id;
        opt3.textContent = `${wallet.icon} ${wallet.name}`;
        transferToWalletSelect.appendChild(opt3);
    });
}

function renderWallets() {
    if (!walletsContainer) return;
    walletsContainer.innerHTML = '';
    
    const balances = {};
    
    // Initialize with initial balances
    state.wallets.forEach(w => {
        balances[w.id] = w.initialBalance || 0;
    });
    
    // Aggregate transactions
    state.transactions.forEach(t => {
        const amt = t.amount;
        if (t.type === 'income') {
            if (balances[t.walletId] !== undefined) {
                balances[t.walletId] += amt;
            }
        } else if (t.type === 'expense') {
            if (balances[t.walletId] !== undefined) {
                balances[t.walletId] -= amt;
            }
        } else if (t.type === 'transfer') {
            if (balances[t.fromWalletId] !== undefined) {
                balances[t.fromWalletId] -= amt;
            }
            if (balances[t.toWalletId] !== undefined) {
                balances[t.toWalletId] += amt;
            }
        }
    });
    
    const nativeFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
    const formatter = { format: (val) => nativeFormatter.format(val).replace('฿', '฿ ') };
    
    // 1. Render "ทุกบัญชี" (All Accounts) Card at the beginning
    let totalInitialSum = 0;
    state.wallets.forEach(w => {
        totalInitialSum += w.initialBalance || 0;
    });
    let allIncome = 0;
    let allExpense = 0;
    state.transactions.forEach(t => {
        if (t.type === 'income') allIncome += t.amount;
        else if (t.type === 'expense') allExpense += t.amount;
    });
    const totalAllBalance = totalInitialSum + allIncome - allExpense;

    const allCard = document.createElement('div');
    allCard.className = 'wallet-card';
    allCard.style.borderLeftColor = 'var(--primary)';
    
    const isAllSelected = (state.selectedWalletId || 'all') === 'all';
    if (isAllSelected) {
        allCard.classList.add('active');
    }

    allCard.innerHTML = `
        <div class="wallet-card-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="wallet-card-name" style="font-size: 0.88rem; font-weight: 600; color: var(--text-muted);">💼 ทุกบัญชี</span>
        </div>
        <div class="wallet-card-balance" style="color: ${totalAllBalance < 0 ? 'var(--expense)' : 'var(--text-main)'}; font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem;">
            ${formatter.format(totalAllBalance)}
        </div>
    `;

    allCard.addEventListener('click', () => {
        state.selectedWalletId = 'all';
        render();
    });

    walletsContainer.appendChild(allCard);

    // 2. Render individual wallet cards
    state.wallets.forEach(wallet => {
        const currentBalance = balances[wallet.id] || 0;
        
        const card = document.createElement('div');
        card.className = 'wallet-card';
        card.style.borderLeftColor = wallet.color;
        card.setAttribute('data-id', wallet.id);
        
        const isSelected = state.selectedWalletId === wallet.id;
        if (isSelected) {
            card.classList.add('active');
        }

        card.innerHTML = `
            <div class="wallet-card-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
                <span class="wallet-card-name" style="font-size: 0.88rem; font-weight: 600; color: var(--text-muted);">${wallet.icon} ${wallet.name}</span>
                <div class="wallet-card-actions" style="display: flex; gap: 0.35rem; align-items: center; z-index: 5;">
                    <span class="wallet-edit-btn" style="color: var(--text-muted-more); font-size: 0.8rem; cursor: pointer;">✏️</span>
                    <span class="wallet-delete-btn" style="color: var(--text-muted-more); font-size: 0.8rem; cursor: pointer; display: none;">✕</span>
                </div>
            </div>
            <div class="wallet-card-balance" style="color: ${currentBalance < 0 ? 'var(--expense)' : 'var(--text-main)'}; font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem;">
                ${formatter.format(currentBalance)}
            </div>
        `;
        
        // Handle select wallet on click (toggles back to all if selected again)
        card.addEventListener('click', () => {
            if (state.selectedWalletId === wallet.id) {
                state.selectedWalletId = 'all';
            } else {
                state.selectedWalletId = wallet.id;
            }
            render();
        });

        // Edit button click handler
        const editBtn = card.querySelector('.wallet-edit-btn');
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                startEditWallet(wallet.id);
            });
        }

        // Show delete button on hover if it is not the default wallet
        if (wallet.id !== 'default-wallet') {
            const deleteBtn = card.querySelector('.wallet-delete-btn');
            if (deleteBtn) {
                deleteBtn.style.display = 'block';
                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await handleWalletDeletion(wallet.id, wallet.name);
                });
            }
        }
        
        walletsContainer.appendChild(card);
    });
}

async function handleWalletDeletion(id, name) {
    // Check if wallet is used in transactions
    const isUsed = state.transactions.some(t => t.walletId === id || t.fromWalletId === id || t.toWalletId === id);
    if (isUsed) {
        alert(`ไม่สามารถลบกระเป๋าเงิน "${name}" ได้ เนื่องจากมีธุรกรรมที่ผูกกับกระเป๋านี้อยู่ แนะนำให้ลบหรือเปลี่ยนบัญชีก่อนลบกระเป๋าครับ`);
        return;
    }
    
    if (confirm(`คุณต้องการลบกระเป๋าเงิน "${name}" หรือไม่?`)) {
        try {
            if (db) {
                await deleteWalletDB(id);
            }
            state.wallets = state.wallets.filter(w => w.id !== id);
            showToast(`🗑️ ลบกระเป๋าเงิน "${name}" แล้ว`);
            populateWalletsDropdowns();
            render();
        } catch (e) {
            console.error('Failed to delete wallet:', e);
            showToast('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    }
}

function startEditWallet(id) {
    const wallet = state.wallets.find(w => w.id === id);
    if (!wallet) return;

    const editWalletIdInput = document.getElementById('edit-wallet-id');
    const walletModalTitle = document.getElementById('wallet-modal-title');
    const saveWalletBtn = document.getElementById('save-wallet-btn');

    if (editWalletIdInput) editWalletIdInput.value = id;
    if (walletModalTitle) walletModalTitle.textContent = '💼 แก้ไขกระเป๋าเงิน';
    if (saveWalletBtn) saveWalletBtn.textContent = '✨ บันทึกการแก้ไข';

    walletNameInput.value = wallet.name;
    
    // Populate balance and format it appropriately
    const rawVal = wallet.initialBalance !== undefined ? wallet.initialBalance : 0;
    walletBalanceInput.value = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(rawVal);
    
    walletIconSelect.value = wallet.icon || '💼';
    walletColorSelect.value = wallet.color || '#ff8e3c';

    addWalletModal.style.display = 'flex';
    walletNameInput.focus();
}

function resetWalletFormState() {
    const editWalletIdInput = document.getElementById('edit-wallet-id');
    const walletModalTitle = document.getElementById('wallet-modal-title');
    const saveWalletBtn = document.getElementById('save-wallet-btn');

    if (editWalletIdInput) editWalletIdInput.value = '';
    if (walletModalTitle) walletModalTitle.textContent = '💼 เพิ่มกระเป๋าเงินใหม่';
    if (saveWalletBtn) saveWalletBtn.textContent = '✨ บันทึกกระเป๋าเงิน';

    if (walletNameInput) walletNameInput.value = '';
    if (walletBalanceInput) walletBalanceInput.value = '0';
    if (walletIconSelect) walletIconSelect.value = '💼';
    if (walletColorSelect) walletColorSelect.value = '#ff8e3c';
}

async function handleAddWallet(e) {
    e.preventDefault();
    
    const name = walletNameInput.value.trim();
    const initialBalance = parseFloat(walletBalanceInput.value.replace(/,/g, '')) || 0;
    const icon = walletIconSelect.value;
    const color = walletColorSelect.value;
    
    if (!name) {
        alert('กรุณากรอกชื่อกระเป๋าเงิน');
        return;
    }

    const editWalletIdInput = document.getElementById('edit-wallet-id');
    const editId = editWalletIdInput ? editWalletIdInput.value : '';

    if (editId) {
        // Edit flow
        const walletIndex = state.wallets.findIndex(w => w.id === editId);
        if (walletIndex === -1) return;
        
        const originalWallet = state.wallets[walletIndex];
        const updatedWallet = {
            ...originalWallet,
            name,
            initialBalance,
            icon,
            color
        };
        
        try {
            if (db) {
                await saveWalletDB(updatedWallet);
            }
            state.wallets[walletIndex] = updatedWallet;
            
            if (!db) {
                saveStateToStorage();
            }
            
            addWalletModal.style.display = 'none';
            showToast(`💼 แก้ไขกระเป๋าเงิน "${name}" สำเร็จ!`);
            
            resetWalletFormState();
            populateWalletsDropdowns();
            render();
        } catch (err) {
            console.error('Error editing wallet:', err);
            showToast('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        }
        return;
    }
    
    const newWallet = {
        id: 'wallet-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        name,
        initialBalance,
        icon,
        color,
        createdAt: Date.now()
    };
    
    try {
        if (db) {
            await saveWalletDB(newWallet);
        }
        state.wallets.push(newWallet);
        
        if (!db) {
            saveStateToStorage();
        }
        
        addWalletModal.style.display = 'none';
        showToast(`💼 เพิ่มกระเป๋าเงิน "${name}" สำเร็จ!`);
        
        resetWalletFormState();
        populateWalletsDropdowns();
        render();
    } catch (err) {
        console.error('Error adding wallet:', err);
        showToast('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

// ==========================================
// TOAST NOTIFICATION SYSTEM
// ==========================================

let toastTimeout;
function showToast(message) {
    toastMessageEl.textContent = message;
    toastEl.classList.add('show');
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toastEl.classList.remove('show');
    }, 3000);
}

// ==========================================
// THEME HANDLING
// ==========================================

function toggleTheme() {
    if (state.theme === 'dark') {
        state.theme = 'light';
    } else if (state.theme === 'light') {
        state.theme = 'cat';
    } else {
        state.theme = 'dark';
    }
    
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('finflow_theme', state.theme);
    if (!db) {
        saveStateToStorage();
    }

    // Update chart on theme change by destroying and recreating
    if (analyticsState.chartInstance) {
        analyticsState.chartInstance.destroy();
        analyticsState.chartInstance = null;
        updateAnalyticsChart();
    }

    updateThemeToggleIcons();
    
    let themeLabel = 'มืด';
    let toastIcon = '🌙';
    if (state.theme === 'light') {
        themeLabel = 'สว่าง';
        toastIcon = '☀️';
    } else if (state.theme === 'cat') {
        themeLabel = 'น้องแมว 🐈';
        toastIcon = '🐈';
    }
    showToast(`${toastIcon} เปลี่ยนเป็นโหมด ${themeLabel}`);
}

function updateThemeToggleIcons() {
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');
    const catImg = themeToggleBtn.querySelector('.cat-toggle-img');
    
    if (state.theme === 'light') {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'block';
        if (catImg) catImg.style.display = 'none';
    } else if (state.theme === 'cat') {
        if (sunIcon) sunIcon.style.display = 'none';
        if (moonIcon) moonIcon.style.display = 'none';
        if (catImg) catImg.style.display = 'block';
    } else {
        if (sunIcon) sunIcon.style.display = 'block';
        if (moonIcon) moonIcon.style.display = 'none';
        if (catImg) catImg.style.display = 'none';
    }
}

// ==========================================
// DATA EXPORT & IMPORT (JSON BACKUP)
// ==========================================

function exportDataJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchor = document.createElement('a');
    
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
    
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `FinFlow_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('📥 ส่งออกไฟล์สำรองสำเร็จ!');
}

function handleImportData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(event) {
        try {
            const importedData = JSON.parse(event.target.result);
            
            // Basic structure validation
            if (importedData && Array.isArray(importedData.transactions)) {
                if (db) {
                    await clearAllTransactionsDB();
                    for (const tx of importedData.transactions) {
                        await saveTransactionDB(tx);
                    }
                    
                    if (Array.isArray(importedData.wallets) && importedData.wallets.length > 0) {
                        await clearAllWalletsDB();
                        for (const w of importedData.wallets) {
                            await saveWalletDB(w);
                        }
                        state.wallets = importedData.wallets;
                    }
                }
                
                state.transactions = importedData.transactions;
                if (!db && Array.isArray(importedData.wallets)) {
                    state.wallets = importedData.wallets;
                }
                
                state.transactions = state.transactions.map(tx => {
                    if (!tx.walletId && tx.type !== 'transfer') {
                        tx.walletId = 'default-wallet';
                    }
                    return tx;
                });
                
                if (importedData.theme) {
                    state.theme = importedData.theme;
                    localStorage.setItem('finflow_theme', state.theme);
                }
                
                if (!db) {
                    saveStateToStorage();
                }
                
                document.documentElement.setAttribute('data-theme', state.theme || 'dark');
                updateThemeToggleIcons();
                
                populateWalletsDropdowns();
                showToast('📤 กู้คืนข้อมูลเรียบร้อยแล้ว!');
                render();
            } else {
                alert('ไฟล์ข้อมูลไม่ถูกต้อง กรุณาใช้ไฟล์สำรองของ FinFlow เท่านั้น');
            }
        } catch (err) {
            console.error(err);
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์');
        }
        
        // Reset file input value
        importFileInput.value = '';
    };
    reader.readAsText(file);
}

// ==========================================
// PWA & SERVICE WORKER MANAGEMENT
// ==========================================

let deferredPrompt;

// Register Service Worker
const isLocalHost = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.hostname.startsWith('192.168.') || 
                    window.location.hostname.startsWith('172.') || 
                    window.location.hostname.startsWith('10.');

if ('serviceWorker' in navigator) {
    if (isLocalHost) {
        // Unregister any active service worker in local development to prevent aggressive cache
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (let registration of registrations) {
                registration.unregister().then((success) => {
                    if (success) {
                        console.log('Unregistered active Service Worker for local dev.');
                        if ('caches' in window) {
                            caches.keys().then((keys) => {
                                Promise.all(keys.map(key => caches.delete(key))).then(() => {
                                    console.log('Cleared all caches.');
                                });
                            });
                        }
                    }
                });
            }
        });
    } else {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then((reg) => console.log('Service Worker: Registered successfully:', reg.scope))
                .catch((err) => console.error('Service Worker: Registration failed:', err));
        });
    }
}

// Track beforeinstallprompt Event
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the custom install button
    const installPwaBtn = document.getElementById('install-pwa-btn');
    if (installPwaBtn) {
        installPwaBtn.style.display = 'block';
    }
});

// Hide install button when app is installed
window.addEventListener('appinstalled', (evt) => {
    console.log('FinFlow was installed.');
    deferredPrompt = null;
    const installPwaBtn = document.getElementById('install-pwa-btn');
    if (installPwaBtn) {
        installPwaBtn.style.display = 'none';
    }
    showToast('🎉 ติดตั้งแอพ FinFlow สำเร็จ!');
});
