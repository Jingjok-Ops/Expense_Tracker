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

    // Home summary month selector
    if (homeMonthSelect) {
        homeMonthSelect.value = state.homeSummaryMonth;
        homeMonthSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                state.homeSummaryMonth = e.target.value;
            } else {
                state.homeSummaryMonth = new Date().toISOString().substring(0, 7);
                homeMonthSelect.value = state.homeSummaryMonth;
            }
            render();
        });
    }

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

    // Refresh app button (Cat logo)
    const headerRefreshBtn = document.getElementById('header-refresh-btn');
    if (headerRefreshBtn) {
        headerRefreshBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // Analytics type toggle switch listener
    document.querySelectorAll('input[name="chart-type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            analyticsState.activeType = e.target.value;
            analyticsState.overrideDateRange = null;
            updateAnalyticsChart();
        });
    });

    // Analytics timeframe toggle switch listener
    document.querySelectorAll('input[name="timeframe"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            analyticsState.activeTimeframe = e.target.value;
            analyticsState.currentOffset = 0; // reset navigation offset
            analyticsState.comparisonOffset = 0; // reset comparison page offset
            analyticsState.overrideDateRange = null;
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
            analyticsState.overrideDateRange = null;
            updateAnalyticsChart();
        });
        nextBtn.addEventListener('click', () => {
            analyticsState.currentOffset++;
            analyticsState.comparisonOffset = 0; // reset comparison page offset
            analyticsState.overrideDateRange = null;
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
            analyticsState.overrideDateRange = null;
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
                    // Swiped left (finger moves left -> go to future / next page -> forward)
                    if ((analyticsState.comparisonOffset || 0) < 0) {
                        analyticsState.comparisonOffset = (analyticsState.comparisonOffset || 0) + 1;
                        if (document.startViewTransition) {
                            document.startViewTransition({ update: updateComparisonChart, types: ['forward'] });
                        } else {
                            updateComparisonChart();
                        }
                    } else {
                        showToast('แสดงข้อมูลล่าสุดแล้ว');
                    }
                } else {
                    // Swiped right (finger moves right -> go to past / previous page -> backward)
                    analyticsState.comparisonOffset = (analyticsState.comparisonOffset || 0) - 1;
                    if (document.startViewTransition) {
                        document.startViewTransition({ update: updateComparisonChart, types: ['backward'] });
                    } else {
                        updateComparisonChart();
                    }
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
// START THE APP
// ==========================================
document.addEventListener('DOMContentLoaded', initApp);

