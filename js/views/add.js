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

