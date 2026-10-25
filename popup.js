(() => {
    const isPopup = new URLSearchParams(location.search).has('popup');
    const canTab = !!(window.chrome && chrome.tabs && chrome.runtime && chrome.runtime.getURL);
    if (!isPopup) return;
    document.documentElement.classList.add('popup');
    if (!canTab) return;

    const openTab = (page) => {
        chrome.tabs.create({ url: chrome.runtime.getURL('index.html' + (page ? '?open=' + page : '')) });
        window.close();
    };

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('openTabBtn');
        if (btn) {
            btn.hidden = false;
            btn.addEventListener('click', () => openTab(''));
        }
        document.querySelectorAll('.add-btn').forEach(label => {
            label.title = 'Откроется во вкладке: выбор файлов закрывает это окно';
            const span = label.querySelector('span');
            if (span) span.textContent += ' ↗';
            label.addEventListener('click', (e) => {
                e.preventDefault();
                openTab('music');
            });
        });
    });
})();
