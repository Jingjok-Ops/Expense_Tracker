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

