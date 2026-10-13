let allDataframeRecords = [];
let chartHistogramInstance = null;
let chartPieInstance = null;
let chartTimelineInstance = null;

const colorPalette = [
    '#2563eb', '#16a34a', '#d97706', '#dc2626', '#9333ea',
    '#0891b2', '#ea580c', '#4f46e5', '#059669', '#b91c1c'
];

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
});

/**
 * Inicializa os ouvintes de eventos da interface.
 */
function initEventListeners() {
    const btnUpload = document.getElementById('btnUpload');
    const btnSample = document.getElementById('btnSample');
    const fileInput = document.getElementById('fileInput');
    const dfSearchInput = document.getElementById('dfSearchInput');
    const selectSenderHistory = document.getElementById('selectSenderHistory');
    const selectSenderHistogram = document.getElementById('selectSenderHistogram');

    btnUpload.addEventListener('click', handleUpload);
    btnSample.addEventListener('click', handleLoadSample);
    dfSearchInput.addEventListener('input', handleFilterDataframe);
    selectSenderHistory.addEventListener('change', handleSenderHistoryChange);
    selectSenderHistogram.addEventListener('change', handleSenderHistogramChange);

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

/**
 * Alterna a aba ativa e garante o redimensionamento correto dos graficos.
 * @param {string} tabId - Identificador do painel de destino.
 */
function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activePane = document.getElementById(tabId);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.add('active');

    if (tabId === 'tab-histogram' && chartHistogramInstance) chartHistogramInstance.resize();
    if (tabId === 'tab-pie' && chartPieInstance) chartPieInstance.resize();
    if (tabId === 'tab-timeline' && chartTimelineInstance) chartTimelineInstance.resize();
}

/**
 * Exibe alertas de status para o usuario.
 * @param {string} message - Texto informativo ou de erro.
 * @param {string} type - 'success' ou 'error'.
 */
function showAlert(message, type) {
    const alertBox = document.getElementById('statusAlert');
    alertBox.textContent = message;
    alertBox.className = `status-alert ${type}`;
    alertBox.classList.remove('hidden');
}

/**
 * Envia o arquivo selecionado para o endpoint /api/upload.
 */
async function handleUpload() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files || fileInput.files.length === 0) {
        showAlert('Por favor, selecione um arquivo .txt antes de continuar.', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    showAlert('Processando arquivo, por favor aguarde...', 'success');

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Erro ao processar o arquivo.', 'error');
            return;
        }

        showAlert(`Sucesso! ${data.total_messages} mensagens e ${data.total_senders} remetentes carregados.`, 'success');
        updateMetrics(data.total_messages, data.total_senders);
        await loadAllDashboardData(data.senders);
    } catch (err) {
        showAlert('Falha na conexao com o servidor.', 'error');
    }
}

/**
 * Carrega a conversa pre-configurada de exemplo via /api/load-sample.
 */
async function handleLoadSample() {
    showAlert('Carregando conversa de exemplo...', 'success');

    try {
        const response = await fetch('/api/load-sample', {
            method: 'POST'
        });
        const data = await response.json();

        if (!response.ok) {
            showAlert(data.error || 'Erro ao carregar exemplo.', 'error');
            return;
        }

        showAlert(`Exemplo carregado! ${data.total_messages} mensagens e ${data.total_senders} remetentes.`, 'success');
        updateMetrics(data.total_messages, data.total_senders);
        await loadAllDashboardData(data.senders);
    } catch (err) {
        showAlert('Falha na conexao com o servidor.', 'error');
    }
}

/**
 * Atualiza os contadores no topo da pagina.
 */
function updateMetrics(totalMessages, totalSenders) {
    document.getElementById('metricTotalMessages').textContent = totalMessages;
    document.getElementById('metricTotalSenders').textContent = totalSenders;
    document.getElementById('metricsSection').classList.remove('hidden');
    document.getElementById('navTabs').classList.remove('hidden');
    document.getElementById('tabContentWrapper').classList.remove('hidden');
}

/**
 * Carrega e popula todas as tabelas e graficos requisitados.
 * @param {Array<string>} senders - Lista de remetentes unicos.
 */
async function loadAllDashboardData(senders) {
    populateSenderSelectors(senders);

    await Promise.all([
        loadDataframeTable(),
        loadSummaryTable(),
        loadSenderHistory(senders.length > 0 ? senders[0] : ''),
        loadHistogramChart(senders.length > 0 ? senders[0] : null),
        loadPieChart(),
        loadTimelineChart()
    ]);
}

/**
 * Popula os elementos select de remetente nas abas de historico e histograma.
 */
function populateSenderSelectors(senders) {
    const selHistory = document.getElementById('selectSenderHistory');
    const selHistog = document.getElementById('selectSenderHistogram');

    selHistory.innerHTML = '';
    selHistog.innerHTML = '';

    const optAll = document.createElement('option');
    optAll.value = '';
    optAll.textContent = 'Todos os Remetentes';
    selHistog.appendChild(optAll);

    senders.forEach(sender => {
        const opt1 = document.createElement('option');
        opt1.value = sender;
        opt1.textContent = sender;
        selHistory.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = sender;
        opt2.textContent = sender;
        selHistog.appendChild(opt2);
    });
}

/**
 * Carrega a tabela completa do DataFrame via /api/dataframe.
 */
async function loadDataframeTable() {
    try {
        const res = await fetch('/api/dataframe');
        const json = await res.json();
        allDataframeRecords = json.data || [];
        renderDataframeRows(allDataframeRecords);
    } catch (err) {
        console.error('Erro ao obter dataframe:', err);
    }
}

/**
 * Renderiza linhas da tabela do DataFrame com base na busca textual.
 */
function renderDataframeRows(records) {
    const tbody = document.getElementById('dfTableBody');
    const counter = document.getElementById('dfCounter');
    tbody.innerHTML = '';

    counter.textContent = `${records.length} registros`;

    const limit = Math.min(records.length, 500);
    for (let i = 0; i < limit; i++) {
        const row = records[i];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${escapeHtml(row['data'])}</td>
            <td>${escapeHtml(row['hora'])}</td>
            <td><strong>${escapeHtml(row['nome do remetente'])}</strong></td>
            <td>${escapeHtml(row['mensagem'])}</td>
        `;
        tbody.appendChild(tr);
    }

    if (records.length > limit) {
        const trNotice = document.createElement('tr');
        trNotice.innerHTML = `<td colspan="4" style="text-align: center; color: #64748b; font-style: italic;">Exibindo primeiros ${limit} de ${records.length} registros.</td>`;
        tbody.appendChild(trNotice);
    }
}

/**
 * Filtra os registros do Dataframe em tempo real via campo de busca.
 */
function handleFilterDataframe(e) {
    const term = e.target.value.toLowerCase().trim();
    if (!term) {
        renderDataframeRows(allDataframeRecords);
        return;
    }

    const filtered = allDataframeRecords.filter(r => {
        return (r['nome do remetente'] && r['nome do remetente'].toLowerCase().includes(term)) ||
               (r['mensagem'] && r['mensagem'].toLowerCase().includes(term)) ||
               (r['data'] && r['data'].includes(term));
    });
    renderDataframeRows(filtered);
}

/**
 * Carrega o Resumo das Conversas via /api/summary.
 */
async function loadSummaryTable() {
    try {
        const res = await fetch('/api/summary');
        const summary = await res.json();

        const tbody = document.getElementById('summaryTableBody');
        tbody.innerHTML = '';

        summary.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><strong>${escapeHtml(item['nome do remetente'])}</strong></td>
                <td>${item['total_mensagens']}</td>
                <td>${item['percentual']}%</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao obter resumo:', err);
    }
}

/**
 * Carrega o historico de mensagens para o remetente selecionado via /api/history.
 */
async function loadSenderHistory(senderName) {
    if (!senderName) return;

    try {
        const res = await fetch(`/api/history?sender=${encodeURIComponent(senderName)}`);
        const history = await res.json();

        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '';

        history.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${escapeHtml(item['data'])}</td>
                <td>${escapeHtml(item['hora'])}</td>
                <td>${escapeHtml(item['mensagem'])}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Erro ao obter historico:', err);
    }
}

function handleSenderHistoryChange(e) {
    loadSenderHistory(e.target.value);
}

/**
 * Carrega e renderiza o histograma diario de mensagens via /api/chart/histogram.
 */
async function loadHistogramChart(senderName) {
    try {
        const url = senderName ? `/api/chart/histogram?sender=${encodeURIComponent(senderName)}` : '/api/chart/histogram';
        const res = await fetch(url);
        const data = await res.json();

        const ctx = document.getElementById('chartHistogram').getContext('2d');

        if (chartHistogramInstance) {
            chartHistogramInstance.destroy();
        }

        chartHistogramInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.labels,
                datasets: [{
                    label: senderName ? `Mensagens por dia - ${senderName}` : 'Mensagens por dia (Todos)',
                    data: data.values,
                    backgroundColor: '#2563eb',
                    borderColor: '#1d4ed8',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro no histograma:', err);
    }
}

function handleSenderHistogramChange(e) {
    loadHistogramChart(e.target.value || null);
}

/**
 * Carrega e renderiza o grafico de pizza de percentual via /api/chart/pie.
 */
async function loadPieChart() {
    try {
        const res = await fetch('/api/chart/pie');
        const data = await res.json();

        const ctx = document.getElementById('chartPie').getContext('2d');

        if (chartPieInstance) {
            chartPieInstance.destroy();
        }

        chartPieInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: data.labels,
                datasets: [{
                    data: data.percentages,
                    backgroundColor: colorPalette.slice(0, data.labels.length),
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const idx = context.dataIndex;
                                const count = data.counts[idx];
                                const pct = data.percentages[idx];
                                return ` ${context.label}: ${pct}% (${count} msgs)`;
                            }
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro no grafico de pizza:', err);
    }
}

/**
 * Carrega e renderiza o grafico de linhas temporal com todos os remetentes via /api/chart/timeline.
 */
async function loadTimelineChart() {
    try {
        const res = await fetch('/api/chart/timeline');
        const data = await res.json();

        const ctx = document.getElementById('chartTimeline').getContext('2d');

        if (chartTimelineInstance) {
            chartTimelineInstance.destroy();
        }

        const datasets = data.series.map((item, idx) => {
            const color = colorPalette[idx % colorPalette.length];
            return {
                label: item.sender,
                data: item.counts,
                borderColor: color,
                backgroundColor: color,
                tension: 0.2,
                fill: false,
                pointRadius: 4,
                pointHoverRadius: 6
            };
        });

        chartTimelineInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.dates,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
    } catch (err) {
        console.error('Erro no grafico de linhas:', err);
    }
}

/**
 * Escapa caracteres HTML para prevencao basica de injecao no DOM.
 */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
