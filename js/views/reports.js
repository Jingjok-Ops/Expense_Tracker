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

    // Scroll to top with multiple fallbacks for different browsers on all tabs
    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        window.scrollTo(0, 0);
    }
    document.body.scrollTop = 0; // For older Safari
    document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
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
            chartCenterValue.style.fontSize = '0.85rem';
        } else if (len > 11) {
            chartCenterValue.style.fontSize = '1.05rem';
        } else if (len > 8) {
            chartCenterValue.style.fontSize = '1.25rem';
        } else {
            chartCenterValue.style.fontSize = '1.5rem'; // use CSS default or slightly larger
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
                     left: window.innerWidth <= 600 ? 40 : 45,
                     right: window.innerWidth <= 600 ? 40 : 45,
                     top: window.innerWidth <= 600 ? 55 : 65,
                     bottom: window.innerWidth <= 600 ? 40 : 45
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
                     
                     // Track drawn label coordinates to prevent overlapping
                     const drawnLabels = [];
                     
                     chart.data.datasets.forEach((dataset, i) => {
                         const meta = chart.getDatasetMeta(i);
                         meta.data.forEach((element, index) => {
                             const dataVal = dataset.data[index];
                             const totalVal = dataset.data.reduce((a, b) => a + b, 0);
                             if (totalVal === 0) return;
                             const percentFloat = parseFloat(((dataVal / totalVal) * 100).toFixed(1));
                             if (percentFloat === 0) return;

                             // Get animating properties safely
                             const props = element.getProps(['x', 'y', 'startAngle', 'endAngle', 'innerRadius', 'outerRadius'], true);
                             const { x, y, startAngle, endAngle, innerRadius, outerRadius } = props || element;

                             if (x === undefined || y === undefined || startAngle === undefined || endAngle === undefined) {
                                 return;
                             }

                             const halfAngle = startAngle + (endAngle - startAngle) / 2;
                             
                             // Offset label 15px outside the outer radius initially
                             let labelRadius = outerRadius + 15;
                             let posX = x + Math.cos(halfAngle) * labelRadius;
                             let posY = y + Math.sin(halfAngle) * labelRadius;

                             // Anti-collision logic for small slices
                             let collision = true;
                             let attempts = 0;
                             while (collision && attempts < 6) {
                                 collision = false;
                                 for (const prev of drawnLabels) {
                                     const distY = Math.abs(posY - prev.y);
                                     const distX = Math.abs(posX - prev.x);
                                     // If labels are too close, increase the radius
                                     if (distY < 14 && distX < 30) {
                                         collision = true;
                                         break;
                                     }
                                 }
                                 if (collision) {
                                     labelRadius += 12; // push further out
                                     posX = x + Math.cos(halfAngle) * labelRadius;
                                     posY = y + Math.sin(halfAngle) * labelRadius;
                                     attempts++;
                                 }
                             }
                             
                             drawnLabels.push({ x: posX, y: posY });

                             // Draw connecting line if the label was pushed out
                             if (labelRadius > outerRadius + 16) {
                                 ctx.beginPath();
                                 ctx.moveTo(x + Math.cos(halfAngle) * (outerRadius + 2), y + Math.sin(halfAngle) * (outerRadius + 2));
                                 ctx.lineTo(x + Math.cos(halfAngle) * (labelRadius - 10), y + Math.sin(halfAngle) * (labelRadius - 10));
                                 ctx.strokeStyle = state.theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
                                 ctx.lineWidth = 1;
                                 ctx.stroke();
                             }

                             ctx.fillStyle = state.theme === 'dark' ? '#e2e8f0' : (state.theme === 'cat' ? '#5d4037' : '#2d3748');
                             ctx.font = '600 12px Sarabun, Outfit, sans-serif';
                             
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
                             
                             ctx.fillText(`${percentFloat}%`, posX, posY);
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
                            size: 11
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
                            size: 11
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
                ctx.font = '600 11px Sarabun, Outfit, sans-serif';
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

