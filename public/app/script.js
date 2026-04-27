/* ============================================================
   fake.ia — script.js
   ⚠️ BACKEND/INTEGRAÇÃO n8n NÃO ALTERADOS
   ============================================================ */
const WEBHOOK_URL = "https://stockmann.app.n8n.cloud/webhook-test/fakenews";

/* ============================================================
   TEMA (DARK / LIGHT)
   ============================================================ */
function toggleTheme() {
  const html    = document.documentElement;
  const icon    = document.getElementById("themeIcon");
  const label   = document.getElementById("themeLabel");
  const isLight = html.getAttribute("data-theme") === "light";

  if (isLight) {
    html.setAttribute("data-theme", "dark");
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    label.textContent = "Modo claro";
    localStorage.setItem("tema", "dark");
  } else {
    html.setAttribute("data-theme", "light");
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    label.textContent = "Modo escuro";
    localStorage.setItem("tema", "light");
  }
}

/* ============================================================
   BOOT
   ============================================================ */
window.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("tema") || "dark";
  const html  = document.documentElement;
  const icon  = document.getElementById("themeIcon");
  const label = document.getElementById("themeLabel");

  html.setAttribute("data-theme", saved);
  if (saved === "light") {
    icon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    label.textContent = "Modo escuro";
  }

  /* Contador + auto-resize do textarea */
  const textarea = document.getElementById("texto");
  textarea.addEventListener("input", () => {
    updateCharCount();
    autoGrow(textarea);
  });

  /* Sidebar mobile */
  const menuBtn      = document.getElementById("menuBtn");
  const sidebar      = document.getElementById("sidebar");
  const backdrop     = document.getElementById("sidebarBackdrop");
  const sidebarClose = document.getElementById("sidebarClose");

  const openSidebar  = () => {
    sidebar.classList.add("is-open");
    backdrop.classList.add("is-open");
    document.body.classList.add("no-scroll");
    menuBtn?.setAttribute("aria-expanded", "true");
  };
  const closeSidebar = () => {
    sidebar.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
    menuBtn?.setAttribute("aria-expanded", "false");
  };

  menuBtn?.addEventListener("click", openSidebar);
  backdrop?.addEventListener("click", closeSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSidebar(); });
});

function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
}

/* ============================================================
   CONTADOR DE CARACTERES
   ============================================================ */
function updateCharCount() {
  const val   = document.getElementById("texto").value;
  const count = document.getElementById("charCount");
  const len   = val.length;
  count.textContent = len === 0
    ? "0 caracteres"
    : `${len.toLocaleString("pt-BR")} caractere${len !== 1 ? "s" : ""}`;
  count.style.color = len > 5000 ? "var(--danger)" : "";
}

/* ============================================================
   ATALHO Ctrl/⌘ + Enter
   ============================================================ */
function handleKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    verificar();
  }
}

/* ============================================================
   VERIFICAR — LÓGICA PRINCIPAL (back-end INALTERADO)
   ============================================================ */
async function verificar() {
  const textarea = document.getElementById("texto");
  const texto    = textarea.value.trim();
  if (!texto) { textarea.focus(); return; }

  const sendBtn = document.getElementById("sendBtn");
  sendBtn.disabled = true;

  addMsg(texto, "user");
  textarea.value = "";
  autoGrow(textarea);
  updateCharCount();

  const loading = addLoadingBubble();

  try {
    /* ---- CHAMADA AO WEBHOOK n8n — INALTERADA ---- */
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto })
    });
    if (!res.ok) throw new Error("Erro na resposta do servidor");

    const data = await res.text();
    loading.remove();

    let respostaFinal;
    try {
      const jsonParsed = JSON.parse(data);
      respostaFinal = jsonParsed.text || jsonParsed.resposta || data;
    } catch (e) {
      respostaFinal = data;
    }

    renderResultado(respostaFinal);
  } catch (error) {
    loading.remove();
    console.error("Erro:", error);
    addMsg("⚠️ Não foi possível conectar ao servidor. Verifique se o workflow está ativo e tente novamente.", "bot");
  } finally {
    sendBtn.disabled = false;
  }
}

/* ============================================================
   RENDERIZAR RESULTADO (com botão de copiar)
   ============================================================ */
function renderResultado(texto) {
  const messages = document.getElementById("messages");
  const msgDiv   = document.createElement("div");
  msgDiv.className = "msg bot";

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar bot-avatar";
  avatar.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z"/><path d="M8.5 12 L11 14.5 L15.5 9.5"/></svg>';

  const content = document.createElement("div");
  content.className = "msg-content";

  const paragrafos = texto.split(/\n{1,}/).filter(p => p.trim());
  const textoHtml  = paragrafos.map(p => `<p>${escapeHtml(p)}</p>`).join("");

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
    Copiar resposta
  `;
  copyBtn.onclick = () => copiarTexto(copyBtn, texto);

  content.innerHTML = textoHtml;
  content.appendChild(copyBtn);

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(content);
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

/* ============================================================
   COPIAR TEXTO
   ============================================================ */
function copiarTexto(btn, texto) {
  navigator.clipboard.writeText(texto).then(() => {
    btn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copiado!
    `;
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copiar resposta
      `;
      btn.classList.remove("copied");
    }, 2000);
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

/* ============================================================
   ADICIONAR MENSAGEM
   ============================================================ */
function addMsg(texto, tipo) {
  const messages = document.getElementById("messages");
  const msgDiv   = document.createElement("div");
  msgDiv.className = "msg " + tipo;

  const avatar = document.createElement("div");
  if (tipo === "bot") {
    avatar.className = "msg-avatar bot-avatar";
    avatar.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z"/><path d="M8.5 12 L11 14.5 L15.5 9.5"/></svg>';
  } else {
    avatar.className = "msg-avatar user-avatar";
    avatar.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }

  const content = document.createElement("div");
  content.className = "msg-content";

  if (tipo === "user") {
    const paragrafos = texto.split(/\n{1,}/).filter(p => p.trim());
    content.innerHTML = paragrafos.map(p => `<p>${escapeHtml(p)}</p>`).join("");
  } else {
    content.innerHTML = `<p>${texto}</p>`;
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(content);
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
  return msgDiv;
}

/* ============================================================
   LOADING BUBBLE
   ============================================================ */
function addLoadingBubble() {
  const messages = document.getElementById("messages");
  const msgDiv   = document.createElement("div");
  msgDiv.className = "msg bot loading-bubble";

  const avatar = document.createElement("div");
  avatar.className = "msg-avatar bot-avatar";
  avatar.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 L20 5 V11 C20 16.5 16.5 20.5 12 22 C7.5 20.5 4 16.5 4 11 V5 Z"/><path d="M8.5 12 L11 14.5 L15.5 9.5"/></svg>';

  const content = document.createElement("div");
  content.className = "msg-content";
  content.innerHTML = `
    <div class="spinner"></div>
    <span>Analisando notícia</span>
    <div class="loading-dots"><span></span><span></span><span></span></div>
  `;

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(content);
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
  return msgDiv;
}

/* ============================================================
   UTIL
   ============================================================ */
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
