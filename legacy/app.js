document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    initTheme();
    initNavigation();
});

// Theme Management
function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const themeLabel = document.querySelector('.theme-toggle-container span');

    const savedTheme = localStorage.getItem('theme') || 'light';
    htmlElement.setAttribute('data-theme', savedTheme);
    themeToggle.checked = savedTheme === 'dark';
    updateThemeLabel(savedTheme);

    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeLabel(newTheme);
        updateChartsTheme(newTheme);
    });

    function updateThemeLabel(theme) {
        if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro';
    }
}

// Navigation Management
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewNameDisplay = document.getElementById('current-view-name');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = item.dataset.view;
            if (!viewId) return;

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            views.forEach(v => v.classList.remove('active'));
            const targetView = document.getElementById(`${viewId}-view`);
            if (targetView) targetView.classList.add('active');

            const viewLabel = item.querySelector('span').textContent;
            viewNameDisplay.textContent = (viewId === 'dashboard') ? 'Panel JGM' : viewLabel;
        });
    });
}

// Charts
let flowChart, pieChart;
function initCharts() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#8899A6' : '#7F8C8D';
    const gridColor = isDark ? '#2F3336' : '#E0E6ED';

    const ctxFlow = document.getElementById('flowChart').getContext('2d');
    flowChart = new Chart(ctxFlow, {
        type: 'line',
        data: {
            labels: Array.from({ length: 20 }, (_, i) => i + 1),
            datasets: [
                { label: 'Ingresos', data: [0, 5, 12, 40, 32, 45, 55, 80, 110], borderColor: '#00BFA5', fill: false, tension: 0.4 },
                { label: 'Gastos', data: [0, 2, 8, 15, 12, 18, 22, 25, 32], borderColor: '#7F8C8D', fill: false, tension: 0.4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { grid: { color: gridColor }, ticks: { color: textColor } }, x: { grid: { display: false }, ticks: { color: textColor } } }
        }
    });

    const ctxPie = document.getElementById('expensesPieChart').getContext('2d');
    pieChart = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Mercado', 'Transporte', 'Perro', 'Salidas', 'Otros'],
            datasets: [{ data: [30.5, 20.0, 12.5, 10.0, 27.0], backgroundColor: ['#4BC0C0', '#54D2D2', '#82E0AA', '#FAD7A0', '#D5DBDB'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

function updateChartsTheme(theme) {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#8899A6' : '#7F8C8D';
    const gridColor = isDark ? '#2F3336' : '#E0E6ED';
    if (flowChart) {
        flowChart.options.scales.y.grid.color = gridColor;
        flowChart.options.scales.y.ticks.color = textColor;
        flowChart.options.scales.x.ticks.color = textColor;
        flowChart.update();
    }
}
