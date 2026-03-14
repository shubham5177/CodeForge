const LANG_EXT = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    go: 'go',
    rust: 'rs',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    bash: 'sh',
    sql: 'sql',
    auto: 'txt'
};

let rawCode = '';
let currentTab = 'raw';
let isStreaming = false;

const promptEl = document.getElementById('prompt-input');
const genBtn = document.getElementById('gen-btn');
const genBtnText = document.getElementById('gen-btn-text');
const genBtnIcon = document.getElementById('gen-btn-icon');
const codeArea = document.getElementById('code-container');
const emptyState = document.getElementById('empty-state');
const codePreEl = document.getElementById('code-pre');
const lineNumsEl = document.getElementById('line-numbers');
const statsBar = document.getElementById('stats-bar');
const progressFill = document.getElementById('progress-fill');
const statusPip = document.getElementById('status-pip');
const statusLbl = document.getElementById('status-label');
const modelDot = document.getElementById('model-dot');
const charCountEl = document.getElementById('char-count');
const topbarPage = document.getElementById('topbar-page');

document.getElementById('temp-range').addEventListener('input', e => {
    document.getElementById('temp-display').textContent = (e.target.value / 10).toFixed(1);
});
document.getElementById('tok-range').addEventListener('input', e => {
    document.getElementById('tok-display').textContent = e.target.value;
});

promptEl.addEventListener('input', () => {
    charCountEl.textContent = promptEl.value.length + ' chars';
});

promptEl.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') generate();
});

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function setPrompt(text) {
    promptEl.value = text;
    charCountEl.textContent = text.length + ' chars';
    promptEl.focus();
    document.getElementById('sidebar').classList.remove('open');
}

function clearPrompt() {
    promptEl.value = '';
    charCountEl.textContent = '0 chars';
    promptEl.focus();
}

let toastTimer;

function showToast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
}

function setStreaming(on) {
    isStreaming = on;
    genBtn.disabled = on;
    genBtnText.textContent = on ? 'Generating…' : 'Generate Code';
    genBtnIcon.textContent = on ? '⏳' : '⚡';

    statusPip.className = 'status-pip ' + (on ? 'busy' : 'ready');
    statusLbl.textContent = on ? 'streaming' : 'ready';
    modelDot.className = 'model-dot ' + (on ? 'working' : 'online');

    progressFill.className = 'progress-fill' + (on ? ' streaming' : '');
}

function highlight(code) {
    return code
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/(#[^\n]*|\/\/[^\n]*)/g, '<span class="tok-cm">$1</span>')
        .replace(/\/\*[\s\S]*?\*\//g, '<span class="tok-cm">$&</span>')
        .replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/g, '<span class="tok-str">$&</span>')
        .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="tok-str">$1</span>')
        .replace(/\b(def|class|import|from|return|if|else|elif|for|while|in|not|and|or|True|False|None|lambda|with|as|pass|raise|try|except|finally|yield|async|await|function|const|let|var|new|this|export|default|extends|implements|interface|type|enum|struct|fn|pub|use|mod|match|where|impl|self|mut|ref|go|defer|chan|range|make|append|package|func|SELECT|FROM|WHERE|JOIN|ON|GROUP|ORDER|BY|INSERT|UPDATE|DELETE|CREATE|TABLE|INDEX|WITH|HAVING|LIMIT|void|int|string|bool|float|double|long|short|static|final|abstract|public|private|protected|override|super|switch|case|break|continue|println|printf|echo|print)\b/g,
            '<span class="tok-kw">$1</span>')
        .replace(/@\w+/g, '<span class="tok-dec">$&</span>')
        .replace(/\b([a-z_][a-zA-Z0-9_]*)\s*(?=\()/g, '<span class="tok-fn">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="tok-cls">$1</span>')
        .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
}

function renderOutput() {
    if (!rawCode) return;
    const lines = rawCode.split('\n');
    lineNumsEl.textContent = lines.map((_, i) => String(i + 1).padStart(3, ' ')).join('\n');

    if (currentTab === 'hi') {
        codePreEl.innerHTML = highlight(rawCode) + (isStreaming ? '<span class="s-cursor"></span>' : '');
    } else {
        codePreEl.textContent = rawCode;
        if (isStreaming) {
            const cursor = document.createElement('span');
            cursor.className = 's-cursor';
            codePreEl.appendChild(cursor);
        }
    }

    document.getElementById('s-lines').textContent = lines.length;
    document.getElementById('s-chars').textContent = rawCode.length.toLocaleString();
    document.getElementById('s-lang').textContent =
        document.getElementById('lang-select').value;
}

function setTab(t) {
    currentTab = t;
    document.getElementById('tab-hi').classList.toggle('active', t === 'hi');
    document.getElementById('tab-raw').classList.toggle('active', t === 'raw');
    renderOutput();
}

function clearOutput() {
    rawCode = '';
    codeArea.style.display = 'none';
    emptyState.style.display = 'flex';
    statsBar.style.display = 'none';
    progressFill.className = 'progress-fill';
}

async function copyCode() {
    if (!rawCode) return;
    try {
        await navigator.clipboard.writeText(rawCode);
        const btn = document.getElementById('copy-btn');
        btn.textContent = 'Copied ✓';
        btn.classList.add('success');
        setTimeout(() => { btn.textContent = 'Copy';
            btn.classList.remove('success'); }, 2000);
        showToast('Code copied to clipboard', 'success');
    } catch {
        showToast('Clipboard access denied', 'error');
    }
}

function saveCode() {
    if (!rawCode) return;
    const lang = document.getElementById('lang-select').value;
    const ext = LANG_EXT[lang] || 'txt';
    const blob = new Blob([rawCode], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `codeforge.${ext}`;
    a.click();
    showToast(`Saved as codeforge.${ext}`, 'success');
}

async function generate() {
    const prompt = promptEl.value.trim();
    if (!prompt) { showToast('Please enter a prompt first', 'error'); return; }
    if (isStreaming) return;

    rawCode = '';
    setStreaming(true);
    topbarPage.textContent = prompt.slice(0, 40) + (prompt.length > 40 ? '…' : '');
    emptyState.style.display = 'none';
    codeArea.style.display = 'flex';
    statsBar.style.display = 'flex';
    codePreEl.innerHTML = '<span class="s-cursor"></span>';
    lineNumsEl.textContent = '  1';

    const payload = {
        prompt,
        lang: document.getElementById('lang-select').value,
        style: document.getElementById('style-select').value,
        temperature: parseFloat(document.getElementById('temp-display').textContent),
        max_tokens: parseInt(document.getElementById('tok-display').textContent),
    };

    try {
        const resp = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const data = line.slice(6).trim();
                if (data === '[DONE]') break;
                try {
                    const obj = JSON.parse(data);
                    if (obj.error) throw new Error(obj.error);
                    if (obj.token) { rawCode += obj.token;
                        renderOutput(); }
                } catch (e) {
                    if (e.message !== 'Unexpected end of JSON input') {
                        showToast('Error: ' + e.message, 'error');
                    }
                }
            }
        }

    } catch (e) {
        showToast('Generation failed: ' + e.message, 'error');
        statusPip.className = 'status-pip error';
        statusLbl.textContent = 'error';
        if (!rawCode) {
            codeArea.style.display = 'none';
            emptyState.style.display = 'flex';
            statsBar.style.display = 'none';
        }
    } finally {
        setStreaming(false);
        renderOutput();
    }
}

statusPip.className = 'status-pip ready';
statusLbl.textContent = 'ready';
modelDot.className = 'model-dot online';