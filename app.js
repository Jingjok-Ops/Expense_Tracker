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
// EVENT LISTENERS SETUP
// ==========================================

function setupEventListeners() {
    // Listen for transaction type toggles
    document.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            handleTransactionTypeChange(e.target.value);
        });
    });

    // Wallets Modal triggers
    if (addWalletBtn && addWalletModal && closeWalletModalBtn) {
        addWalletBtn.addEventListener('click', () => {
            resetWalletFormState();
            addWalletModal.style.display = 'flex';
            walletNameInput.focus();
        });
        
        closeWalletModalBtn.addEventListener('click', () => {
            addWalletModal.style.display = 'none';
            resetWalletFormState();
        });
        
        // Close modal on clicking backdrop
        addWalletModal.addEventListener('click', (e) => {
            if (e.target === addWalletModal) {
                addWalletModal.style.display = 'none';
                resetWalletFormState();
            }
        });
    }
    
    if (walletForm) {
        walletForm.addEventListener('submit', handleAddWallet);
    }

    // Form submit listener
    transactionForm.addEventListener('submit', handleAddTransaction);

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', cancelEdit);
    }

    // Filter change listeners
    filterTypeSelect.addEventListener('change', render);
    searchNoteInput.addEventListener('input', render);

    // Theme toggler
    themeToggleBtn.addEventListener('click', toggleTheme);

    // Export & Import listeners
    exportBtn.addEventListener('click', exportDataJSON);
    importBtnTrigger.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', handleImportData);

    // Form field inline validation helpers
    amountInput.addEventListener('blur', () => {
        validateAmountField();
    });
    // Reusable amount formatting setup helper
    function setupAmountFormatting(inputElement, onValidCallback) {
        inputElement.addEventListener('input', () => {
            const originalVal = inputElement.value;
            const originalCursor = inputElement.selectionStart;

            // Count non-comma characters before cursor
            let nonCommaBeforeCursor = 0;
            for (let i = 0; i < originalCursor; i++) {
                if (originalVal[i] !== ',') {
                    nonCommaBeforeCursor++;
                }
            }

            // Clean input: only digits and dot
            let clean = originalVal.replace(/[^0-9.]/g, '');
            
            // Handle multiple decimal points (keep only first)
            const dotIndex = clean.indexOf('.');
            if (dotIndex !== -1) {
                clean = clean.substring(0, dotIndex + 1) + clean.substring(dotIndex + 1).replace(/\./g, '');
            }

            // Split integer and decimal parts
            const parts = clean.split('.');
            let integerPart = parts[0];
            const decimalPart = parts.length > 1 ? parts[1] : null;

            // Strip leading zeros from integer part
            const oldLen = integerPart.length;
            integerPart = integerPart.replace(/^0+(?!$)/, '');
            const zeroDifference = oldLen - integerPart.length;

            // Adjust non-comma count for stripped leading zeros
            let targetNonCommaCount = Math.max(0, nonCommaBeforeCursor - zeroDifference);

            // Format integer part with commas
            let formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            let formatted = decimalPart !== null ? formattedInteger + '.' + decimalPart : formattedInteger;

            // Set value back
            inputElement.value = formatted;

            // Calculate and set new cursor position
            let newCursorPosition = 0;
            let nonCommaCount = 0;
            for (let i = 0; i < formatted.length; i++) {
                if (nonCommaCount >= targetNonCommaCount) {
                    break;
                }
                newCursorPosition++;
                if (formatted[i] !== ',') {
                    nonCommaCount++;
                }
            }
            inputElement.setSelectionRange(newCursorPosition, newCursorPosition);

            if (onValidCallback) {
                onValidCallback(formatted);
            }
        });
    }

    // Apply formatting to main amount input
    setupAmountFormatting(amountInput, (formatted) => {
        const numericVal = parseFloat(formatted.replace(/,/g, ''));
        if (numericVal > 0) {
            amountError.style.display = 'none';
            amountInput.style.borderColor = '';
        }
    });

    // Apply formatting to wallet starting balance input
    setupAmountFormatting(walletBalanceInput);

    // Mobile Premium 3-Tab Navigation switching listeners
    if (tabHomeBtn && tabAddBtn && tabReportsBtn) {
        tabHomeBtn.addEventListener('click', () => switchTab('home'));
        tabAddBtn.addEventListener('click', () => switchTab('add'));
        tabReportsBtn.addEventListener('click', () => switchTab('reports'));
    }

    // Analytics type toggle switch listener
    document.querySelectorAll('input[name="chart-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            analyticsState.activeType = e.target.value;
            updateAnalyticsChart();
        });
    });

    // Analytics timeframe toggle switch listener
    document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            analyticsState.activeTimeframe = e.target.value;
            analyticsState.currentOffset = 0; // reset navigation offset
            analyticsState.comparisonOffset = 0; // reset comparison page offset
            updateAnalyticsChart();
        });
    });

    // Analytics date navigation arrow button listeners
    const prevBtn = document.getElementById('analytics-prev-btn');
    const nextBtn = document.getElementById('analytics-next-btn');
    if (prevBtn && nextBtn) {
        prevBtn.addEventListener('click', () => {
            analyticsState.currentOffset--;
            analyticsState.comparisonOffset = 0; // reset comparison page offset
            updateAnalyticsChart();
        });
        nextBtn.addEventListener('click', () => {
            analyticsState.currentOffset++;
            analyticsState.comparisonOffset = 0; // reset comparison page offset
            updateAnalyticsChart();
        });
    }

    // Analytics date picker input listener
    const analyticsDatePicker = document.getElementById('analytics-date-picker');
    if (analyticsDatePicker) {
        analyticsDatePicker.addEventListener('change', (e) => {
            const selectedVal = e.target.value;
            if (!selectedVal) return;
            
            const selectedDate = new Date(selectedVal);
            const now = new Date();
            const timeframe = analyticsState.activeTimeframe || 'month';
            
            if (timeframe === 'day') {
                const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
                const d2 = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 12, 0, 0);
                analyticsState.currentOffset = Math.round((d2 - d1) / (24 * 60 * 60 * 1000));
            } else if (timeframe === 'week') {
                const nowDay = now.getDay();
                const diffNowMonday = now.getDate() - nowDay + (nowDay === 0 ? -6 : 1);
                const nowMonday = new Date(now.getFullYear(), now.getMonth(), diffNowMonday, 12, 0, 0);
                
                const selDay = selectedDate.getDay();
                const diffSelMonday = selectedDate.getDate() - selDay + (selDay === 0 ? -6 : 1);
                const selMonday = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), diffSelMonday, 12, 0, 0);
                
                analyticsState.currentOffset = Math.round((selMonday - nowMonday) / (7 * 24 * 60 * 60 * 1000));
            } else if (timeframe === 'month') {
                analyticsState.currentOffset = (selectedDate.getFullYear() - now.getFullYear()) * 12 + (selectedDate.getMonth() - now.getMonth());
            } else if (timeframe === 'year') {
                analyticsState.currentOffset = selectedDate.getFullYear() - now.getFullYear();
            }
            
            analyticsState.comparisonOffset = 0; // reset comparison page offset
            updateAnalyticsChart();
            analyticsDatePicker.value = '';
        });
    }



    // Analytics active wallet select change listener
    const analyticsWalletSelect = document.getElementById('analytics-active-wallet-select');
    if (analyticsWalletSelect) {
        analyticsWalletSelect.addEventListener('change', (e) => {
            state.selectedWalletId = e.target.value;
            render();
        });
    }

    // Form Date Shortcuts (Today / Yesterday)
    if (btnDateToday && btnDateYesterday && dateInput) {
        btnDateToday.addEventListener('click', () => {
            btnDateToday.classList.add('active');
            btnDateYesterday.classList.remove('active');
            dateInput.value = getTodayDateString(0);
        });

        btnDateYesterday.addEventListener('click', () => {
            btnDateToday.classList.remove('active');
            btnDateYesterday.classList.add('active');
            dateInput.value = getTodayDateString(-1);
        });

        dateInput.addEventListener('change', () => {
            const val = dateInput.value;
            if (val === getTodayDateString(0)) {
                btnDateToday.classList.add('active');
                btnDateYesterday.classList.remove('active');
            } else if (val === getTodayDateString(-1)) {
                btnDateToday.classList.remove('active');
                btnDateYesterday.classList.add('active');
            } else {
                btnDateToday.classList.remove('active');
                btnDateYesterday.classList.remove('active');
            }
        });
    }

    // Calendar Filtering Listeners
    if (filterDateInput) {
        filterDateInput.addEventListener('change', () => {
            if (filterDateInput.value) {
                if (resetDateBtn) resetDateBtn.style.display = 'flex';
            } else {
                if (resetDateBtn) resetDateBtn.style.display = 'none';
            }
            render();
        });
    }

    if (resetDateBtn && filterDateInput) {
        resetDateBtn.addEventListener('click', () => {
            filterDateInput.value = '';
            filterDateInput.type = 'text';
            resetDateBtn.style.display = 'none';
            render();
        });
    }

    // PWA Install click listener
    const installPwaBtn = document.getElementById('install-pwa-btn');
    if (installPwaBtn) {
        installPwaBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            installPwaBtn.disabled = true;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`PWA Install Choice: ${outcome}`);
            deferredPrompt = null;
            installPwaBtn.style.display = 'none';
            installPwaBtn.disabled = false;
        });
    }

    // Add touch swipe listeners for comparison section card (to switch pages of data)
    const compSection = document.querySelector('.comparison-section');
    if (compSection) {
        let touchStartX = 0;
        let touchStartY = 0;
        
        compSection.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        compSection.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;
            
            // Check if it's mostly a horizontal swipe and swipe distance is significant (> 40px)
            if (Math.abs(diffX) > 40 && Math.abs(diffX) > Math.abs(diffY)) {
                if (diffX < 0) {
                    // Swiped left (finger moves left -> go to future / next page)
                    if ((analyticsState.comparisonOffset || 0) < 0) {
                        analyticsState.comparisonOffset = (analyticsState.comparisonOffset || 0) + 1;
                        updateComparisonChart();
                    } else {
                        showToast('แสดงข้อมูลล่าสุดแล้ว');
                    }
                } else {
                    // Swiped right (finger moves right -> go to past / previous page)
                    analyticsState.comparisonOffset = (analyticsState.comparisonOffset || 0) - 1;
                    updateComparisonChart();
                }
            }
        }, { passive: true });
    }

    // Update charts on screen resize to keep layout and width precise
    window.addEventListener('resize', () => {
        if (viewReports && viewReports.classList.contains('active')) {
            updateComparisonChart();
        }
    });
}

// ==========================================
// CATEGORY HANDLING
// ==========================================

function populateCategories(type) {
    categorySelect.innerHTML = '';
    const list = CATEGORIES[type] || [];
    
    list.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = `${cat.icon} ${cat.name}`;
        categorySelect.appendChild(option);
    });
}

function getCategoryInfo(categoryId, type) {
    const list = CATEGORIES[type] || [];
    const found = list.find(cat => cat.id === categoryId);
    if (found) return found;
    
    // Fallback search in opposite type if category not found in current list
    const oppositeList = CATEGORIES[type === 'income' ? 'expense' : 'income'] || [];
    const foundOpposite = oppositeList.find(cat => cat.id === categoryId);
    if (foundOpposite) return foundOpposite;

    // Absolute fallback
    return { name: categoryId, icon: '🏷️', color: '#999999' };
}

// ==========================================
// TRANSACTION CRUD OPERATIONS
// ==========================================

async function handleAddTransaction(e) {
    e.preventDefault();

    const isAmountValid = validateAmountField();
    if (!isAmountValid) {
        return; // Don't submit if amount field is invalid
    }

    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = parseFloat(amountInput.value.replace(/,/g, ''));
    const date = dateInput.value;
    const note = noteInput.value.trim();

    let walletId = null;
    let fromWalletId = null;
    let toWalletId = null;
    let category = null;

    if (type === 'transfer') {
        fromWalletId = transferFromWalletSelect.value;
        toWalletId = transferToWalletSelect.value;
        category = 'transfer';
        
        if (fromWalletId === toWalletId) {
            alert('ไม่สามารถโอนเงินภายในบัญชีเดียวกันได้ กรุณาเลือกบัญชีปลายทางอื่น');
            return;
        }
        
        // Compute source wallet current balance to warn user if overdrafting
        const fromWallet = state.wallets.find(w => w.id === fromWalletId);
        let currentFromBalance = fromWallet.initialBalance || 0;
        state.transactions.forEach(t => {
            // If editing, skip the current transaction from balance calculations to prevent double counting
            if (editIdInput && editIdInput.value && t.id === editIdInput.value) return;

            if (t.type === 'income' && t.walletId === fromWalletId) currentFromBalance += t.amount;
            else if (t.type === 'expense' && t.walletId === fromWalletId) currentFromBalance -= t.amount;
            else if (t.type === 'transfer') {
                if (t.fromWalletId === fromWalletId) currentFromBalance -= t.amount;
                if (t.toWalletId === fromWalletId) currentFromBalance += t.amount;
            }
        });
        
        if (amount > currentFromBalance) {
            if (!confirm(`ยอดเงินคงเหลือในกระเป๋า "${fromWallet.name}" มีเพียง ฿ ${currentFromBalance.toFixed(2)} ซึ่งน้อยกว่ายอดที่ต้องการโอน ฿ ${amount.toFixed(2)} คุณยังต้องการทำรายการต่อไปหรือไม่?`)) {
                return;
            }
        }
    } else {
        walletId = transactionWalletSelect.value;
        category = categorySelect.value;
    }

    const editingId = editIdInput ? editIdInput.value : '';
    const isEditMode = !!editingId;

    // Create transaction object
    let transactionObj;
    if (isEditMode) {
        const existingTx = state.transactions.find(tx => tx.id === editingId);
        if (!existingTx) {
            showToast('❌ ไม่พบรายการที่ต้องการแก้ไข');
            return;
        }
        transactionObj = {
            ...existingTx,
            type,
            amount,
            category,
            date,
            note: note || (type === 'transfer' ? 'โอนเงินระหว่างกระเป๋า' : getCategoryInfo(category, type).name),
            walletId,
            fromWalletId,
            toWalletId
        };
    } else {
        transactionObj = {
            id: 'tx-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            type,
            amount,
            category,
            date,
            note: note || (type === 'transfer' ? 'โอนเงินระหว่างกระเป๋า' : getCategoryInfo(category, type).name),
            walletId,
            fromWalletId,
            toWalletId
        };
    }

    try {
        if (db) {
            await saveTransactionDB(transactionObj);
        }

        if (isEditMode) {
            // Update local state
            const index = state.transactions.findIndex(tx => tx.id === editingId);
            if (index !== -1) {
                state.transactions[index] = transactionObj;
            }
        } else {
            // Add new to local state
            state.transactions.unshift(transactionObj);
        }
        
        if (!db) {
            saveStateToStorage();
        }

        // Reset edit form UI state
        if (isEditMode) {
            editIdInput.value = '';
            if (formTitleEl) formTitleEl.textContent = '✍️ บันทึกรายการใหม่';
            const submitBtnEl = document.getElementById('submit-btn');
            if (submitBtnEl) submitBtnEl.textContent = '✨ บันทึกรายการ';
            if (cancelEditBtn) cancelEditBtn.style.display = 'none';
        }

        // Reset Form (except date which defaults back to today)
        amountInput.value = '';
        noteInput.value = '';
        amountInput.style.borderColor = '';
        amountError.style.display = 'none';
        
        // Reset Date shortcut state to Today
        dateInput.value = getTodayDateString(0);
        if (btnDateToday && btnDateYesterday) {
            btnDateToday.classList.add('active');
            btnDateYesterday.classList.remove('active');
        }

        // Reset categories select back to default expense type
        if (isEditMode) {
            const typeExpenseRadio = document.getElementById('type-expense');
            if (typeExpenseRadio) {
                typeExpenseRadio.checked = true;
                handleTransactionTypeChange('expense');
            }
        }

        // Notify user
        showToast(isEditMode ? '📝 แก้ไขรายการเรียบร้อยแล้ว!' : '✨ บันทึกรายการเรียบร้อยแล้ว!');

        // Re-render UI
        render();

        // Stay on the "Add Transaction" page so user can record multiple transactions sequentially
    } catch (err) {
        console.error('Error saving transaction to database:', err);
        showToast('❌ เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
}

function startEditTransaction(id) {
    const t = state.transactions.find(tx => tx.id === id);
    if (!t) return;

    if (editIdInput) editIdInput.value = t.id;

    if (formTitleEl) formTitleEl.textContent = '📝 แก้ไขรายการ';
    const submitBtnEl = document.getElementById('submit-btn');
    if (submitBtnEl) submitBtnEl.textContent = '✨ บันทึกการแก้ไข';
    if (cancelEditBtn) cancelEditBtn.style.display = 'block';

    const radioBtn = document.getElementById(`type-${t.type}`);
    if (radioBtn) {
        radioBtn.checked = true;
        handleTransactionTypeChange(t.type);
    }

    if (amountInput) {
        amountInput.value = formatNumberWithCommas(t.amount);
    }

    if (dateInput) {
        dateInput.value = t.date;
        if (btnDateToday && btnDateYesterday) {
            if (t.date === getTodayDateString(0)) {
                btnDateToday.classList.add('active');
                btnDateYesterday.classList.remove('active');
            } else if (t.date === getTodayDateString(-1)) {
                btnDateToday.classList.remove('active');
                btnDateYesterday.classList.add('active');
            } else {
                btnDateToday.classList.remove('active');
                btnDateYesterday.classList.remove('active');
            }
        }
    }

    if (noteInput) {
        noteInput.value = t.note || '';
    }

    if (t.type === 'transfer') {
        if (transferFromWalletSelect) transferFromWalletSelect.value = t.fromWalletId;
        if (transferToWalletSelect) transferToWalletSelect.value = t.toWalletId;
    } else {
        if (transactionWalletSelect) transactionWalletSelect.value = t.walletId;
        populateCategories(t.type);
        if (categorySelect) categorySelect.value = t.category;
    }

    switchTab('add');
}

function cancelEdit() {
    resetEditFormState();
    switchTab('home');
}

function resetEditFormState() {
    if (editIdInput && editIdInput.value) {
        editIdInput.value = '';
        if (formTitleEl) formTitleEl.textContent = '✍️ บันทึกรายการใหม่';
        const submitBtnEl = document.getElementById('submit-btn');
        if (submitBtnEl) submitBtnEl.textContent = '✨ บันทึกรายการ';
        if (cancelEditBtn) cancelEditBtn.style.display = 'none';

        // Clear Form inputs to blank/default
        amountInput.value = '';
        noteInput.value = '';
        amountInput.style.borderColor = '';
        amountError.style.display = 'none';
        
        dateInput.value = getTodayDateString(0);
        if (btnDateToday && btnDateYesterday) {
            btnDateToday.classList.add('active');
            btnDateYesterday.classList.remove('active');
        }

        const typeExpenseRadio = document.getElementById('type-expense');
        if (typeExpenseRadio) {
            typeExpenseRadio.checked = true;
            handleTransactionTypeChange('expense');
        }
    }
}

function formatNumberWithCommas(num) {
    const parts = num.toFixed(2).split('.');
    const formattedInteger = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInteger + '.' + parts[1];
}

function validateAmountField() {
    const amountVal = parseFloat(amountInput.value.replace(/,/g, ''));
    if (isNaN(amountVal) || amountVal <= 0) {
        amountError.style.display = 'block';
        amountInput.style.borderColor = 'var(--expense)';
        return false;
    }
    amountError.style.display = 'none';
    amountInput.style.borderColor = '';
    return true;
}

async function deleteTransaction(id) {
    if (confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) {
        try {
            if (db) {
                await deleteTransactionDB(id);
            }
            
            state.transactions = state.transactions.filter(t => t.id !== id);
            
            if (!db) {
                saveStateToStorage();
            }
            
            showToast('🗑️ ลบรายการเรียบร้อยแล้ว');
            render();
        } catch (err) {
            console.error('Error deleting transaction:', err);
            showToast('❌ เกิดข้อผิดพลาดในการลบข้อมูล');
        }
    }
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
// RENDER METHODS (UI UPDATES)
// ==========================================

function render() {
    // 1. Calculate financials based on selected wallet
    let totalIncome = 0;
    let totalExpense = 0;
    let netBalance = 0;

    const selId = state.selectedWalletId || 'all';

    if (selId === 'all') {
        let walletInitialSum = 0;
        state.wallets.forEach(w => {
            walletInitialSum += w.initialBalance || 0;
        });

        state.transactions.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else if (t.type === 'expense') {
                totalExpense += t.amount;
            }
        });
        netBalance = walletInitialSum + totalIncome - totalExpense;
    } else {
        const wallet = state.wallets.find(w => w.id === selId);
        const initial = wallet ? (wallet.initialBalance || 0) : 0;
        
        let walletIncome = 0;
        let walletExpense = 0;
        let walletTransfersIn = 0;
        let walletTransfersOut = 0;

        state.transactions.forEach(t => {
            if (t.type === 'income' && t.walletId === selId) {
                walletIncome += t.amount;
            } else if (t.type === 'expense' && t.walletId === selId) {
                walletExpense += t.amount;
            } else if (t.type === 'transfer') {
                if (t.fromWalletId === selId) {
                    walletTransfersOut += t.amount;
                }
                if (t.toWalletId === selId) {
                    walletTransfersIn += t.amount;
                }
            }
        });

        totalIncome = walletIncome;
        totalExpense = walletExpense;
        netBalance = initial + walletIncome - walletExpense + walletTransfersIn - walletTransfersOut;
    }

    // Format currencies
    const nativeFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
    const formatter = { format: (val) => nativeFormatter.format(val).replace('฿', '฿ ') };
    
    netBalanceEl.textContent = formatter.format(netBalance);
    totalIncomeEl.textContent = formatter.format(totalIncome);
    totalExpenseEl.textContent = formatter.format(totalExpense);

    // Update net balance card footer with selected wallet status
    const netBalanceFooter = document.getElementById('net-balance-footer');
    if (netBalanceFooter) {
        if (selId === 'all') {
            netBalanceFooter.innerHTML = `<span class="trend-icon">💼</span> ทุกบัญชีรวมกัน`;
        } else {
            const wallet = state.wallets.find(w => w.id === selId);
            if (wallet) {
                netBalanceFooter.innerHTML = `<span class="trend-icon">${wallet.icon}</span> ${wallet.name} (เฉพาะบัญชีนี้)`;
            }
        }
    }

    // Apply color logic to balance
    if (netBalance < 0) {
        netBalanceEl.style.color = 'var(--expense)';
        netBalanceEl.style.textShadow = '0 0 15px var(--expense-glow)';
    } else if (netBalance > 0) {
        netBalanceEl.style.color = 'var(--income)';
        netBalanceEl.style.textShadow = '0 0 15px var(--income-glow)';
    } else {
        netBalanceEl.style.color = '';
        netBalanceEl.style.textShadow = '';
    }

    // 2. Render transaction list with filters (including selected wallet filter)
    const filterType = filterTypeSelect.value;
    const searchNote = searchNoteInput.value.toLowerCase().trim();
    const filterDate = filterDateInput ? filterDateInput.value : '';

    const filteredTransactions = state.transactions.filter(t => {
        const matchesType = filterType === 'all' || t.type === filterType;
        const matchesSearch = t.note.toLowerCase().includes(searchNote) || 
                            (t.type !== 'transfer' && getCategoryInfo(t.category, t.type).name.toLowerCase().includes(searchNote));
        const matchesDate = !filterDate || t.date === filterDate;
        const matchesWallet = selId === 'all' || 
                              t.walletId === selId || 
                              (t.type === 'transfer' && (t.fromWalletId === selId || t.toWalletId === selId));
        return matchesType && matchesSearch && matchesDate && matchesWallet;
    });

    // Populate transaction list in DOM
    transactionsList.innerHTML = '';

    if (filteredTransactions.length === 0) {
        const emptyLi = document.createElement('li');
        emptyLi.className = 'empty-list';
        emptyLi.textContent = 'ไม่พบรายการบันทึกรายรับรายจ่าย';
        transactionsList.appendChild(emptyLi);
    } else {
        // Sort newest transactions first
        filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        filteredTransactions.forEach(t => {
            const dateObj = new Date(t.date);
            const formattedDate = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });

            const li = document.createElement('li');
            li.className = `transaction-item ${t.type}-type`;
            
            if (t.type === 'transfer') {
                const fromWallet = state.wallets.find(w => w.id === t.fromWalletId) || { icon: '💼', name: 'กระเป๋าหลัก' };
                const toWallet = state.wallets.find(w => w.id === t.toWalletId) || { icon: '💼', name: 'กระเป๋าหลัก' };
                
                li.innerHTML = `
                    <div class="category-icon-badge" style="box-shadow: inset 0 0 8px var(--primary-glow)">
                        ⇄
                    </div>
                    <div class="transaction-item-content">
                        <div class="transaction-item-top">
                            <span class="item-note">${t.note}</span>
                            <span class="item-amount" style="color: var(--text-muted)">${formatter.format(t.amount)}</span>
                        </div>
                        <div class="transaction-item-bottom">
                            <span class="item-meta">
                                <span class="wallet-badge-pill">${fromWallet.icon} ${fromWallet.name}</span>
                                <span> ➜ </span>
                                <span class="wallet-badge-pill">${toWallet.icon} ${toWallet.name}</span>
                                <span class="meta-dot"></span>
                                <span>${formattedDate}</span>
                            </span>
                            <div class="item-actions">
                                <button class="edit-btn" aria-label="แก้ไขรายการ" data-id="${t.id}">
                                    <svg viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.88,8.88M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z" />
                                    </svg>
                                </button>
                                <button class="delete-btn" aria-label="ลบรายการ" data-id="${t.id}">
                                    <svg viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                const catInfo = getCategoryInfo(t.category, t.type);
                const walletInfo = state.wallets.find(w => w.id === t.walletId) || { icon: '💼', name: 'กระเป๋าหลัก' };
                
                li.innerHTML = `
                    <div class="category-icon-badge" style="box-shadow: inset 0 0 8px ${t.type === 'income' ? 'var(--income-glow)' : 'var(--expense-glow)'}">
                        ${catInfo.icon}
                    </div>
                    <div class="transaction-item-content">
                        <div class="transaction-item-top">
                            <span class="item-note">${t.note}</span>
                            <span class="item-amount">${t.type === 'income' ? '+' : '-'}${formatter.format(t.amount)}</span>
                        </div>
                        <div class="transaction-item-bottom">
                            <span class="item-meta">
                                <span>${catInfo.name}</span>
                                <span class="meta-dot"></span>
                                <span class="wallet-badge-pill">${walletInfo.icon} ${walletInfo.name}</span>
                                <span class="meta-dot"></span>
                                <span>${formattedDate}</span>
                            </span>
                            <div class="item-actions">
                                <button class="edit-btn" aria-label="แก้ไขรายการ" data-id="${t.id}">
                                    <svg viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.88,8.88M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z" />
                                    </svg>
                                </button>
                                <button class="delete-btn" aria-label="ลบรายการ" data-id="${t.id}">
                                    <svg viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            // Edit click listener
            li.querySelector('.edit-btn').addEventListener('click', () => {
                startEditTransaction(t.id);
            });

            // Delete click listener
            li.querySelector('.delete-btn').addEventListener('click', () => {
                deleteTransaction(t.id);
            });

            transactionsList.appendChild(li);
        });
    }

    // 3. Render Wallets list
    renderWallets();

    // Sync dropdown selections with the active wallet without rebuilding them
    const analyticsWalletSelect = document.getElementById('analytics-active-wallet-select');
    if (analyticsWalletSelect) {
        analyticsWalletSelect.value = state.selectedWalletId || 'all';
    }

    // 4. Update Analytics view if it's currently open
    updateAnalyticsChart();
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
// ANALYTICS & TAB CONTROL LOGIC
// ==========================================

let analyticsState = {
    activeType: 'expense',
    activeTimeframe: 'month',
    currentOffset: 0,
    chartInstance: null,
    comparisonChartInstance: null
};

function switchTab(tab) {
    if (tab !== 'add') {
        resetEditFormState();
    }

    const tabs = [tabHomeBtn, tabAddBtn, tabReportsBtn];
    const views = [viewHome, viewAdd, viewReports];
    
    // Remove active status from all tabs and views
    tabs.forEach(t => t && t.classList.remove('active'));
    views.forEach(v => v && v.classList.remove('active'));
    
    // Activate the requested tab and view
    if (tab === 'home') {
        if (tabHomeBtn) tabHomeBtn.classList.add('active');
        if (viewHome) viewHome.classList.add('active');
    } else if (tab === 'add') {
        if (tabAddBtn) tabAddBtn.classList.add('active');
        if (viewAdd) viewAdd.classList.add('active');
    } else if (tab === 'reports') {
        if (tabReportsBtn) tabReportsBtn.classList.add('active');
        if (viewReports) viewReports.classList.add('active');
        // Delay chart updates to ensure browser has completed layout pass and canvas is visible
        setTimeout(() => {
            updateAnalyticsChart();
        }, 150);
    }
}

function getDateRangeForTimeframe(timeframe) {
    const now = new Date();
    let start, end;
    let label = '';
    const offset = analyticsState.currentOffset || 0;

    const formatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
    const formatter = new Intl.DateTimeFormat('th-TH', formatOptions);

    if (timeframe === 'day') {
        const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
        start = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0, 0);
        end = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
        label = formatter.format(start);
    } else if (timeframe === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1) + (offset * 7);
        start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
        end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
        end.setHours(23, 59, 59, 999);
        label = `${formatter.format(start)} - ${formatter.format(end)}`;
    } else if (timeframe === 'month') {
        start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
        label = `${formatter.format(start)} - ${formatter.format(end)}`;
    } else if (timeframe === 'year') {
        start = new Date(now.getFullYear() + offset, 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
        label = `${formatter.format(start)} - ${formatter.format(end)}`;
    }

    return { start, end, label };
}

function updateAnalyticsChart() {
    const oldCanvas = document.getElementById('donut-chart');
    if (!oldCanvas) return;

    // Destroy old chart to prevent memory leaks and clear references
    if (analyticsState.chartInstance) {
        analyticsState.chartInstance.destroy();
        analyticsState.chartInstance = null;
    }

    // Create a fresh canvas element to reset all attributes, styles, and cached dimensions
    const canvas = document.createElement('canvas');
    canvas.id = 'donut-chart';
    oldCanvas.replaceWith(canvas);

    const type = analyticsState.activeType;
    const timeframe = analyticsState.activeTimeframe || 'month';
    const { start, end, label: rangeLabel } = getDateRangeForTimeframe(timeframe);

    // Display range label in the UI
    const rangeDisplay = document.getElementById('analytics-date-range');
    if (rangeDisplay) {
        rangeDisplay.textContent = '📅 ' + rangeLabel;
    }

    // Sync the active wallet select dropdown value
    const analyticsWalletSelect = document.getElementById('analytics-active-wallet-select');
    if (analyticsWalletSelect) {
        analyticsWalletSelect.value = state.selectedWalletId || 'all';
    }

    const grouped = {};

    // Group active transactions by category & date range (filtering by selected wallet)
    const selId = state.selectedWalletId || 'all';
    state.transactions
        .filter(t => {
            if (t.type !== type) return false;
            if (selId !== 'all' && t.walletId !== selId) return false;
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        })
        .forEach(t => {
            grouped[t.category] = (grouped[t.category] || 0) + t.amount;
        });

    const total = Object.values(grouped).reduce((sum, val) => sum + val, 0);

    // Update summary texts
    const summaryTotalTitle = document.getElementById('summary-total-title');
    const summaryTotalValue = document.getElementById('summary-total-value');
    const nativeFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });
    const formatter = { format: (val) => nativeFormatter.format(val).replace('฿', '฿ ') };

    if (summaryTotalTitle) {
        summaryTotalTitle.textContent = `ยอดรวม${type === 'income' ? 'รายรับ' : 'รายจ่าย'}ทั้งหมด`;
    }
    if (summaryTotalValue) {
        summaryTotalValue.textContent = formatter.format(total);
        summaryTotalValue.style.color = type === 'income' ? 'var(--income)' : 'var(--expense)';
        summaryTotalValue.style.textShadow = `0 0 10px ${type === 'income' ? 'var(--income-glow)' : 'var(--expense-glow)'}`;
    }

    // Update HTML donut chart center overlay text
    const chartCenterLabel = document.getElementById('chart-center-label');
    const chartCenterValue = document.getElementById('chart-center-value');
    if (chartCenterLabel) {
        chartCenterLabel.textContent = type === 'income' ? 'รวมรายรับ' : 'รวมรายจ่าย';
    }
    if (chartCenterValue) {
        // Use a compact formatter without decimal places for the donut chart center overlay to save space
        const centerNativeFormatter = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
        const centerFormatter = { format: (val) => centerNativeFormatter.format(val).replace('฿', '฿ ') };
        chartCenterValue.textContent = centerFormatter.format(total);

        // Dynamically scale font size based on character length to prevent text overflowing the inner donut hole
        const len = chartCenterValue.textContent.length;
        if (len > 14) {
            chartCenterValue.style.fontSize = '0.74rem';
        } else if (len > 11) {
            chartCenterValue.style.fontSize = '0.88rem';
        } else if (len > 8) {
            chartCenterValue.style.fontSize = '1.05rem';
        } else {
            chartCenterValue.style.fontSize = ''; // use CSS default
        }
    }

    const totalCard = document.querySelector('.summary-total-card');
    if (totalCard) {
        totalCard.style.borderLeftColor = type === 'income' ? 'var(--income)' : 'var(--expense)';
    }

    const emptyState = document.getElementById('chart-empty-state');
    const canvasContainer = document.querySelector('.canvas-container');
    const legendList = document.getElementById('chart-legend-list');

    legendList.innerHTML = '';

    if (total === 0) {
        if (emptyState) emptyState.style.display = 'block';
        if (canvasContainer) canvasContainer.style.display = 'none';
        
        if (analyticsState.chartInstance) {
            analyticsState.chartInstance.destroy();
            analyticsState.chartInstance = null;
        }
        updateComparisonChart();
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (canvasContainer) canvasContainer.style.display = 'block';

    const labels = [];
    const data = [];
    const colors = [];
    const legendData = [];

    Object.keys(grouped).forEach(catId => {
        const amount = grouped[catId];
        const catInfo = getCategoryInfo(catId, type);
        const percent = (amount / total) * 100;

        labels.push(catInfo.name);
        data.push(amount);
        colors.push(catInfo.color);

        legendData.push({
            name: catInfo.name,
            icon: catInfo.icon,
            color: catInfo.color,
            amount: amount,
            percent: percent
        });
    });

    // Sort legend list by highest spending
    legendData.sort((a, b) => b.amount - a.amount);

    legendData.forEach(item => {
        const legendItem = document.createElement('div');
        legendItem.className = 'chart-legend-item';
        legendItem.innerHTML = `
            <div class="legend-left">
                <span class="legend-color-indicator" style="background-color: ${item.color}; box-shadow: 0 0 6px ${item.color}"></span>
                <span class="legend-name">${item.icon} ${item.name}</span>
            </div>
            <div class="legend-right">
                <span class="legend-amount">${formatter.format(item.amount)}</span>
                <span class="legend-percent">${item.percent.toFixed(1)}%</span>
            </div>
        `;
        legendList.appendChild(legendItem);
    });

    const chartBorderColor = state.theme === 'dark' ? '#131520' : (state.theme === 'cat' ? '#fffcf7' : '#ffffff');
    const tooltipBg = state.theme === 'dark' ? '#131520' : (state.theme === 'cat' ? '#fffcf7' : '#ffffff');
    const tooltipTextColor = state.theme === 'dark' ? '#ffffff' : (state.theme === 'cat' ? '#5d4037' : '#131520');
    const tooltipBorderColor = state.theme === 'dark' ? 'rgba(255,255,255,0.08)' : (state.theme === 'cat' ? 'rgba(93,64,55,0.15)' : 'rgba(0,0,0,0.08)');



    const ctx = canvas.getContext('2d');
    analyticsState.chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: chartBorderColor,
                borderWidth: 2,
                hoverOffset: 6
            }]
         },
         options: {
             responsive: true,
             maintainAspectRatio: false,
             layout: {
                 padding: {
                     left: window.innerWidth <= 600 ? 20 : 28,
                     right: window.innerWidth <= 600 ? 20 : 28,
                     top: window.innerWidth <= 600 ? 20 : 28,
                     bottom: window.innerWidth <= 600 ? 24 : 28
                 }
             },
             plugins: {
                 legend: {
                     display: false
                 },
                 tooltip: {
                     backgroundColor: tooltipBg,
                     titleColor: tooltipTextColor,
                     bodyColor: tooltipTextColor,
                     borderColor: tooltipBorderColor,
                     borderWidth: 1,
                     padding: 10,
                     boxPadding: 4,
                     callbacks: {
                         label: function(context) {
                             const val = context.raw || 0;
                             const pct = ((val / total) * 100).toFixed(1);
                             return ` ${formatter.format(val)} (${pct}%)`;
                         }
                     }
                 }
             },
             cutout: '66%',
             animation: {
                 duration: 0
             }
         },
                   plugins: [{
             id: 'slicePercentage',
             afterDatasetsDraw(chart) {
                 try {
                     const { ctx } = chart;
                     ctx.save();
                     chart.data.datasets.forEach((dataset, i) => {
                         const meta = chart.getDatasetMeta(i);
                         meta.data.forEach((element, index) => {
                             const dataVal = dataset.data[index];
                             const totalVal = dataset.data.reduce((a, b) => a + b, 0);
                             if (totalVal === 0) return;
                             const percent = ((dataVal / totalVal) * 100).toFixed(1);
                             
                             // Only show if the slice is large enough (> 1%)
                             if (parseFloat(percent) < 1.0) return;

                             // Get animating properties safely
                             const props = element.getProps(['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'], true);
                             const { x, y, startAngle, endAngle, innerRadius, outerRadius } = props || element;

                             if (x === undefined || y === undefined || startAngle === undefined || endAngle === undefined) {
                                 return;
                             }

                             const halfAngle = startAngle + (endAngle - startAngle) / 2;
                             
                             // Offset label 15px outside the outer radius
                             const labelRadius = outerRadius + 15;
                             const posX = x + Math.cos(halfAngle) * labelRadius;
                             const posY = y + Math.sin(halfAngle) * labelRadius;

                             ctx.fillStyle = state.theme === 'dark' ? '#e2e8f0' : (state.theme === 'cat' ? '#5d4037' : '#2d3748');
                             ctx.font = '600 10px Sarabun, Outfit, sans-serif';
                             
                             // Align text based on its position around the circle to prevent overlap
                             const cos = Math.cos(halfAngle);
                             if (cos > 0.3) {
                                 ctx.textAlign = 'left';
                             } else if (cos < -0.3) {
                                 ctx.textAlign = 'right';
                             } else {
                                 ctx.textAlign = 'center';
                             }

                             const sin = Math.sin(halfAngle);
                             if (sin > 0.5) {
                                 ctx.textBaseline = 'top';
                             } else if (sin < -0.5) {
                                 ctx.textBaseline = 'bottom';
                             } else {
                                 ctx.textBaseline = 'middle';
                             }
                             
                             // Disable shadow for external text for crisp readability
                             ctx.shadowColor = 'transparent';
                             ctx.shadowBlur = 0;
                             ctx.shadowOffsetX = 0;
                             ctx.shadowOffsetY = 0;
                             
                             ctx.fillText(`${percent}%`, posX, posY);
                         });
                     });
                     ctx.restore();
                 } catch (err) {
                     console.error("Chart plugin error:", err);
                     showToast("❌ เกรดข้อผิดพลาด: " + err.message);
                 }
             }
         }]
    });

    // Update Period Comparison Chart & Cards
    updateComparisonChart();
}

function updateComparisonChart() {
    const compTimeframe = analyticsState.activeTimeframe || 'month';
    const oldCanvas = document.getElementById('comparison-bar-chart');
    if (!oldCanvas) return;

    const cleanStr = str => typeof str === 'string' ? str.replace(/[\u200e\u200f\u200b\u200c\u00ad\ufeff]/g, '').trim() : str;

    const scrollViewport = document.getElementById('comp-chart-scroll-viewport');

    // Get the currently navigated date range from updateAnalyticsChart to anchor our comparison chart
    const timeframe = analyticsState.activeTimeframe || 'month';
    const { end } = getDateRangeForTimeframe(timeframe);

    const intervals = [];
    const type = analyticsState.activeType || 'expense';

    const compOffset = analyticsState.comparisonOffset || 0;

    // 1. Generate intervals based on timeframe and page offset (Day=7, Week=4, Month=4, Year=5)
    if (compTimeframe === 'day') {
        const anchorEnd = new Date(end);
        anchorEnd.setDate(anchorEnd.getDate() + compOffset * 7);
        for (let i = 6; i >= 0; i--) {
            const d = new Date(anchorEnd);
            d.setDate(d.getDate() - i);
            const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
            
            const formatOptions = { day: 'numeric', month: 'short' };
            const formatter = new Intl.DateTimeFormat('th-TH', formatOptions);
            const label = cleanStr(formatter.format(startOfDay));
            
            intervals.push({ label, start: startOfDay, end: endOfDay, total: 0, categories: {} });
        }
    } else if (compTimeframe === 'week') {
        const endDay = end.getDay();
        const diffToMonday = end.getDate() - endDay + (endDay === 0 ? -6 : 1);
        const endMonday = new Date(end.getFullYear(), end.getMonth(), diffToMonday);
        
        const anchorMonday = new Date(endMonday.getTime() + compOffset * 4 * 7 * 24 * 60 * 60 * 1000);
        
        for (let i = 3; i >= 0; i--) {
            const startOfWeek = new Date(anchorMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
            endOfWeek.setHours(23, 59, 59, 999);
            
            const startDayVal = startOfWeek.getDate();
            const endDayVal = endOfWeek.getDate();
            const startMonthStr = cleanStr(startOfWeek.toLocaleDateString('th-TH', { month: 'short' }));
            const endMonthStr = cleanStr(endOfWeek.toLocaleDateString('th-TH', { month: 'short' }));
            
            const label = startMonthStr === endMonthStr 
                ? `${startDayVal}-${endDayVal} ${startMonthStr}` 
                : `${startDayVal} ${startMonthStr}-${endDayVal} ${endMonthStr}`;
            
            intervals.push({ label, start: startOfWeek, end: endOfWeek, total: 0, categories: {} });
        }
    } else if (compTimeframe === 'month') {
        for (let i = 3; i >= 0; i--) {
            const targetMonth = end.getMonth() - i + compOffset * 4;
            const startOfMonth = new Date(end.getFullYear(), targetMonth, 1, 0, 0, 0, 0);
            const endOfMonth = new Date(end.getFullYear(), targetMonth + 1, 0, 23, 59, 59, 999);
            
            const formatOptions = { month: 'short', year: '2-digit' };
            const formatter = new Intl.DateTimeFormat('th-TH', formatOptions);
            const label = cleanStr(formatter.format(startOfMonth));
            
            intervals.push({ label, start: startOfMonth, end: endOfMonth, total: 0, categories: {} });
        }
    } else if (compTimeframe === 'year') {
        const anchorYear = end.getFullYear() + compOffset * 5;
        for (let i = 4; i >= 0; i--) {
            const targetYear = anchorYear - i;
            const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
            const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);
            
            const label = `${targetYear + 543}`; // Buddhist Era
            
            intervals.push({ label, start: startOfYear, end: endOfYear, total: 0, categories: {} });
        }
    }

    // 2. Initialize category tracking for selected type
    const cats = CATEGORIES[type] || [];
    intervals.forEach(interval => {
        cats.forEach(c => {
            interval.categories[c.id] = 0;
        });
    });

    // 3. Populate intervals with transaction category sums
    const selId = state.selectedWalletId || 'all';
    state.transactions.forEach(t => {
        if (t.type !== type) return;
        if (selId !== 'all' && t.walletId !== selId) return;
        
        const txDate = new Date(t.date);
        for (const interval of intervals) {
            if (txDate >= interval.start && txDate <= interval.end) {
                interval.categories[t.category] = (interval.categories[t.category] || 0) + t.amount;
                interval.total += t.amount;
                break;
            }
        }
    });

    // 4. Calculate overall average and latest percentage change
    const totalSum = intervals.reduce((sum, item) => sum + item.total, 0);
    const average = totalSum / intervals.length;

    // Display Screen Time summary in UI
    const summaryTitleEl = document.getElementById('comp-summary-title');
    const summaryValueEl = document.getElementById('comp-summary-value');
    const summaryChangeEl = document.getElementById('comp-summary-change');

    if (summaryTitleEl) {
        let titleText = '';
        if (compTimeframe === 'day') titleText = `เฉลี่ยรายวัน (${type === 'income' ? 'รายรับ' : 'รายจ่าย'})`;
        else if (compTimeframe === 'week') titleText = `เฉลี่ยรายสัปดาห์ (${type === 'income' ? 'รายรับ' : 'รายจ่าย'})`;
        else if (compTimeframe === 'month') titleText = `เฉลี่ยรายเดือน (${type === 'income' ? 'รายรับ' : 'รายจ่าย'})`;
        else if (compTimeframe === 'year') titleText = `เฉลี่ยรายปี (${type === 'income' ? 'รายรับ' : 'รายจ่าย'})`;
        
        if (compOffset < 0) {
            titleText += ` (ย้อนหลัง ${Math.abs(compOffset)} หน้า)`;
        }
        summaryTitleEl.textContent = titleText;
    }

    const compEmptyState = document.getElementById('comp-chart-empty-state');
    const compScrollViewport = document.getElementById('comp-chart-scroll-viewport');

    if (totalSum === 0) {
        if (compEmptyState) compEmptyState.style.display = 'block';
        if (compScrollViewport) compScrollViewport.style.display = 'none';

        if (summaryValueEl) {
            summaryValueEl.textContent = '฿ 0.00';
            summaryValueEl.style.color = type === 'income' ? 'var(--income)' : 'var(--expense)';
            summaryValueEl.style.textShadow = `0 0 10px ${type === 'income' ? 'var(--income-glow)' : 'var(--expense-glow)'}`;
        }
        if (summaryChangeEl) {
            summaryChangeEl.className = 'comp-summary-change neutral';
            summaryChangeEl.innerHTML = '—';
        }

        if (analyticsState.comparisonChartInstance) {
            analyticsState.comparisonChartInstance.destroy();
            analyticsState.comparisonChartInstance = null;
        }
        return;
    }

    if (compEmptyState) compEmptyState.style.display = 'none';
    if (compScrollViewport) compScrollViewport.style.display = 'block';

    if (summaryValueEl) {
        summaryValueEl.textContent = '฿ ' + new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(average);
        summaryValueEl.style.color = type === 'income' ? 'var(--income)' : 'var(--expense)';
        summaryValueEl.style.textShadow = `0 0 10px ${type === 'income' ? 'var(--income-glow)' : 'var(--expense-glow)'}`;
    }

    if (summaryChangeEl) {
        const lastVal = intervals[intervals.length - 1].total;
        const prevVal = intervals.length > 1 ? intervals[intervals.length - 2].total : 0;
        
        let changePercent = 0;
        if (prevVal > 0) {
            changePercent = ((lastVal - prevVal) / prevVal) * 100;
        } else if (lastVal > 0) {
            changePercent = 100;
        }

        summaryChangeEl.className = 'comp-summary-change';
        if (changePercent > 0) {
            summaryChangeEl.classList.add('up');
            summaryChangeEl.innerHTML = `▲ ${changePercent.toFixed(0)}% เทียบกับช่วงก่อนหน้า`;
        } else if (changePercent < 0) {
            summaryChangeEl.classList.add('down');
            summaryChangeEl.innerHTML = `▼ ${Math.abs(changePercent).toFixed(0)}% เทียบกับช่วงก่อนหน้า`;
        } else {
            summaryChangeEl.classList.add('neutral');
            summaryChangeEl.innerHTML = `0% เทียบกับช่วงก่อนหน้า`;
        }
    }

    // Destroy old comparison chart instance to prevent memory leaks and clear references
    if (analyticsState.comparisonChartInstance) {
        analyticsState.comparisonChartInstance.destroy();
        analyticsState.comparisonChartInstance = null;
    }

    // Create a fresh canvas element to reset all attributes, styles, and cached dimensions
    const compCanvas = document.createElement('canvas');
    compCanvas.id = 'comparison-bar-chart';

    const scrollContent = document.querySelector('.comp-chart-scroll-content');
    if (scrollContent) {
        scrollContent.style.width = '100%';
    }

    // Explicitly set canvas backing-store dimensions before Chart.js creation to prevent scaling/alignment shift
    const canvasWidth = scrollContent ? scrollContent.clientWidth : (scrollViewport ? scrollViewport.clientWidth : 340);
    compCanvas.width = canvasWidth || 340;
    compCanvas.height = 260; // Matches CSS height of .comp-chart-scroll-content

    oldCanvas.replaceWith(compCanvas);



    const gridColor = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : (state.theme === 'cat' ? 'rgba(93, 64, 55, 0.08)' : 'rgba(0, 0, 0, 0.05)');
    const textFontColor = state.theme === 'dark' ? '#a0aec0' : (state.theme === 'cat' ? '#5d4037' : '#4a5568');

    // 7. Create category datasets
    const datasets = cats.map(cat => {
        return {
            label: `${cat.icon} ${cat.name}`,
            data: intervals.map(interval => interval.categories[cat.id] || 0),
            backgroundColor: cat.color,
            borderRadius: 6,
            borderWidth: 0,
            maxBarThickness: 22
        };
    });

    const ctx = compCanvas.getContext('2d');
    analyticsState.comparisonChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: intervals.map(item => item.label),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    left: 8,
                    right: 15,
                    top: 15,
                    bottom: 0
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                averageLine: {
                    value: average
                },
                tooltip: {
                    padding: 10,
                    backgroundColor: state.theme === 'dark' ? '#131520' : (state.theme === 'cat' ? '#fffcf7' : '#ffffff'),
                    titleColor: state.theme === 'dark' ? '#ffffff' : (state.theme === 'cat' ? '#5d4037' : '#131520'),
                    bodyColor: state.theme === 'dark' ? '#ffffff' : (state.theme === 'cat' ? '#5d4037' : '#131520'),
                    borderColor: state.theme === 'dark' ? 'rgba(255,255,255,0.08)' : (state.theme === 'cat' ? 'rgba(93,64,55,0.15)' : 'rgba(0,0,0,0.08)'),
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            return ` ${context.dataset.label}: ฿ ${new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2 }).format(val)}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    stacked: true,
                    offset: true,
                    grid: {
                        display: false,
                        offset: true
                    },
                    ticks: {
                        color: textFontColor,
                        maxRotation: 0,
                        minRotation: 0,
                        autoSkip: true,
                        align: 'center',
                        font: {
                            family: 'Sarabun, sans-serif',
                            size: 9
                        }
                    }
                },
                y: {
                    stacked: true,
                    position: 'left',
                    grid: {
                        color: gridColor,
                        borderDash: [4, 4],
                        drawTicks: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: textFontColor,
                        maxTicksLimit: 4,
                        padding: 6,
                        crossAlign: 'near',
                        textAlign: 'right',
                        font: {
                            family: 'Outfit, Sarabun, sans-serif',
                            size: 9
                        },
                        callback: function(value) {
                            if (value === 0) return '0';
                            // Format clean numbers without currency prefix to avoid any measurement bugs and save space on mobile
                            return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'averageLine',
            afterDraw(chart) {
                const pluginOptions = chart.options.plugins.averageLine;
                if (!pluginOptions || typeof pluginOptions.value !== 'number' || pluginOptions.value <= 0) return;
                
                const avgVal = pluginOptions.value;
                const { ctx, chartArea: { left, right }, scales: { y } } = chart;
                const yPixel = y.getPixelForValue(avgVal);
                
                if (yPixel < chart.chartArea.top || yPixel > chart.chartArea.bottom) return;
                
                ctx.save();
                ctx.strokeStyle = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.35)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 5]);
                
                ctx.beginPath();
                ctx.moveTo(left, yPixel);
                ctx.lineTo(right, yPixel);
                ctx.stroke();
                
                // Add a text label "เฉลี่ย: ฿ X,XXX" above the line on the right side
                ctx.fillStyle = state.theme === 'dark' ? '#e2e8f0' : '#4a5568';
                ctx.font = '600 9px Sarabun, Outfit, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'bottom';
                const formattedAvg = Math.round(avgVal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                const text = 'เฉลี่ย ' + formattedAvg + ' บาท';
                ctx.fillText(text, right - 5, yPixel - 3);
                ctx.restore();
            }
        }]
    });

    // 8. Programmatically scroll to the far right (most recent data)
    if (scrollViewport) {
        setTimeout(() => {
            scrollViewport.scrollLeft = scrollViewport.scrollWidth;
        }, 50);
    }
}

// ==========================================
// START THE APP
// ==========================================
document.addEventListener('DOMContentLoaded', initApp);

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
