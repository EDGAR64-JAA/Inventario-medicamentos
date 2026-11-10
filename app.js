"use strict";
/* Inventario de Medicamentos — PWA estática para GitHub Pages.
   Datos solo en localStorage de este teléfono/navegador. Sin backend.
   Hora local: La Paz, BCS (America/Mazatlan, UTC-07:00) es la zona del
   dispositivo; las fechas se comparan a medianoche local. */

var STORE_KEY = "inventarioMedicamentos.v1";
var OFF_API = "https://world.openfoodfacts.org/api/v2/product/";
var EXPIRING_DAYS = 30; // "por vencer" = vence en 30 días o menos
var LOW_STOCK = 2;      // "stock bajo" = 2 unidades o menos

var store = loadStore();
var currentFilter = "all";
var searchTerm = "";
var scanner = null;
var scannerRunning = false;

function loadStore() {
  try {
    var raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { medicines: [], links: {} };
    var parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.medicines)) return { medicines: [], links: {} };
    if (!parsed.links || typeof parsed.links !== "object") parsed.links = {};
    return parsed;
  } catch (e) {
    return { medicines: [], links: {} };
  }
}

function saveStore() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* almacenamiento lleno o bloqueado */ }
}

function uid() {
  return "med-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function $(id) { return document.getElementById(id); }

/* ---------- Fechas y caducidad (medianoche local, sin desfase de zona) ---------- */
function parseLocalDate(iso) {
  // "2026-12-01" -> fecha a medianoche local (evita el desfase UTC de new Date(iso))
  var parts = String(iso || "").split("-");
  if (parts.length !== 3) return null;
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}

function todayMidnight() {
  var now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysUntil(expiryIso) {
  var exp = parseLocalDate(expiryIso);
  if (!exp) return null;
  var ms = exp.getTime() - todayMidnight().getTime();
  return Math.round(ms / 86400000);
}

function expiryStatus(med) {
  var d = daysUntil(med.expiry);
  if (d === null) return "ok";
  if (d < 0) return "expired";
  if (d <= EXPIRING_DAYS) return "soon";
  return "ok";
}

function formatDate(iso) {
  var d = parseLocalDate(iso);
  if (!d) return iso || "";
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ---------- Resolución del nombre por código de barras ---------- */
/* 1) registro propio guardado, 2) Open Food Facts (sin clave), 3) pedirlo una vez. */
async function resolveBarcode(code) {
  var clean = String(code || "").replace(/\D/g, "");
  if (!clean) return { code: "", name: "", brand: "", origin: "" };

  var saved = store.links[clean];
  if (saved && saved.name) {
    return { code: clean, name: saved.name, brand: saved.brand || "", origin: "Tu registro anterior" };
  }

  try {
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 8000);
    var res = await fetch(OFF_API + encodeURIComponent(clean) + ".json?fields=product_name,brands,quantity", { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { code: clean, name: "", brand: "", origin: "" };
    var data = await res.json();
    if (data && data.status === 1 && data.product && data.product.product_name) {
      var brand = data.product.brands || "";
      var qty = data.product.quantity || "";
      var presentation = [brand, qty].filter(Boolean).join(" · ");
      return { code: clean, name: data.product.product_name, brand: presentation, origin: "Base pública" };
    }
  } catch (e) {
    /* Sin internet o la base no respondió: se pide el nombre a mano. */
  }
  return { code: clean, name: "", brand: "", origin: "" };
}

function showNameOrigin(origin) {
  var el = $("nameOrigin");
  if (!origin) { el.hidden = true; el.textContent = ""; return; }
  el.hidden = false;
  el.textContent = "Origen del nombre: " + origin + ". Puedes corregirlo antes de guardar.";
}

async function handleBarcode(code) {
  var clean = String(code || "").replace(/\D/g, "");
  if (!clean) { toast("Escribe o escanea un código válido."); return; }
  $("barcodeInput").value = clean;
  showNameOrigin("");
  $("nameInput").value = "";
  $("brandInput").value = "";
  toast("Buscando nombre del código " + clean + "…");
  var found = await resolveBarcode(clean);
  if (found.name) {
    $("nameInput").value = found.name;
    if (found.brand) $("brandInput").value = found.brand;
    showNameOrigin(found.origin);
    toast("Nombre encontrado: " + found.name);
  } else {
    showNameOrigin("Escríbelo");
    toast("Ese código no está en la base pública. Escribe el nombre una vez y quedará guardado para ese código.");
    $("nameInput").focus();
  }
  closeScanner();
  $("formSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------- Escáner (html5-qrcode, CDN) ---------- */
function openScanner() {
  $("scannerSection").hidden = false;
  $("scannerError").hidden = true;
  $("scannerSection").scrollIntoView({ behavior: "smooth", block: "start" });
  if (typeof Html5Qrcode === "undefined") {
    var err = $("scannerError");
    err.hidden = false;
    err.textContent = "No se pudo cargar la librería de escaneo (revisa tu conexión). Puedes escribir el código a mano abajo.";
    return;
  }
  if (scannerRunning) return;
  try {
    scanner = new Html5Qrcode("reader");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 150 } },
      function (decodedText) { handleBarcode(decodedText); },
      function () { /* errores de lectura por cuadro: se ignoran */ }
    ).then(function () { scannerRunning = true; })
    .catch(function (e) {
      var err = $("scannerError");
      err.hidden = false;
      err.textContent = "No se pudo abrir la cámara: " + (e && e.message ? e.message : "permiso denegado o cámara no disponible") + ". Puedes escribir el código a mano.";
    });
  } catch (e) {
    var err2 = $("scannerError");
    err2.hidden = false;
    err2.textContent = "No se pudo iniciar el escáner. Puedes escribir el código a mano.";
  }
}

function closeScanner() {
  $("scannerSection").hidden = true;
  if (scanner && scannerRunning) {
    scanner.stop().then(function () { return scanner.clear(); }).catch(function () {});
    scannerRunning = false;
    scanner = null;
  }
}

/* ---------- Render ---------- */
var PASTELS = ["pastel-blue", "pastel-peach", "pastel-lavender", "pastel-mint"];

function pastelFor(id) {
  var h = 0;
  for (var i = 0; i < String(id).length; i++) h = (h * 31 + String(id).charCodeAt(i)) % 997;
  return PASTELS[h % PASTELS.length];
}

function counts() {
  var soon = 0, low = 0, expired = 0;
  store.medicines.forEach(function (m) {
    var st = expiryStatus(m);
    if (st === "expired") expired++;
    else if (st === "soon") soon++;
    if (Number(m.stock) <= LOW_STOCK) low++;
  });
  return { soon: soon, low: low, expired: expired };
}

function filteredMedicines() {
  var term = searchTerm.trim().toLowerCase();
  return store.medicines
    .filter(function (m) {
      if (currentFilter === "soon") return expiryStatus(m) === "soon";
      if (currentFilter === "expired") return expiryStatus(m) === "expired";
      if (currentFilter === "low") return Number(m.stock) <= LOW_STOCK;
      return true;
    })
    .filter(function (m) {
      if (!term) return true;
      return ((m.name || "") + " " + (m.use || "") + " " + (m.brand || "")).toLowerCase().indexOf(term) !== -1;
    })
    .slice()
    .sort(function (a, b) {
      var da = daysUntil(a.expiry), db = daysUntil(b.expiry);
      if (da === null) return 1;
      if (db === null) return -1;
      return da - db; // lo más próximo a vencer primero
    });
}

function render() {
  var c = counts();
  $("countSoon").textContent = c.soon;
  $("countLow").textContent = c.low;
  $("countExpired").textContent = c.expired;

  var banner = $("alertBanner");
  if (c.expired > 0) {
    banner.hidden = false;
    banner.className = "alert-banner danger";
    banner.textContent = "Tienes " + c.expired + " medicamento(s) vencido(s). Revísalos y deséchalos según las indicaciones de tu farmacia.";
  } else if (c.soon > 0) {
    banner.hidden = false;
    banner.className = "alert-banner";
    banner.textContent = c.soon + " medicamento(s) vence(n) en los próximos 30 días.";
  } else {
    banner.hidden = true;
  }

  document.querySelectorAll(".alert-card").forEach(function (card) {
    card.classList.toggle("active", card.dataset.filter === currentFilter);
  });
  document.querySelectorAll(".chip").forEach(function (chip) {
    chip.classList.toggle("active", chip.dataset.filter === currentFilter);
  });

  var list = filteredMedicines();
  $("listCount").textContent = "(" + list.length + " de " + store.medicines.length + ")";
  $("emptyState").style.display = store.medicines.length === 0 ? "" : "none";

  var ul = $("medicineList");
  ul.innerHTML = list.map(function (m) {
    var st = expiryStatus(m);
    var d = daysUntil(m.expiry);
    var statusText;
    if (st === "expired") statusText = '<span class="expired-text">Vencido hace ' + Math.abs(d) + ' día(s) · ' + escapeHtml(formatDate(m.expiry)) + "</span>";
    else if (st === "soon") statusText = '<span class="soon-text">Vence en ' + d + ' día(s) · ' + escapeHtml(formatDate(m.expiry)) + "</span>";
    else statusText = "Vence: " + escapeHtml(formatDate(m.expiry)) + " (" + d + " días)";

    var stockClass = Number(m.stock) <= 0 ? "zero" : (Number(m.stock) <= LOW_STOCK ? "low" : "");
    var initial = (m.name || "?").trim().charAt(0).toUpperCase();

    return '<li class="med-card ' + st + '">' +
      '<div class="tile ' + pastelFor(m.id) + '">' + escapeHtml(initial) + "</div>" +
      '<div class="med-body">' +
        "<h3>" + escapeHtml(m.name) + "</h3>" +
        '<p class="med-use">' + escapeHtml(m.use || "") + (m.brand ? " · " + escapeHtml(m.brand) : "") + "</p>" +
        '<p class="med-meta">' + statusText + "</p>" +
        '<span class="stock-pill ' + stockClass + '">Stock: ' + Number(m.stock) + "</span>" +
        '<div class="stock-row">' +
          '<button class="stock-btn" type="button" data-action="minus" data-id="' + m.id + '" aria-label="Quitar una unidad">−</button>' +
          '<span class="stock-count">' + Number(m.stock) + "</span>" +
          '<button class="stock-btn" type="button" data-action="plus" data-id="' + m.id + '" aria-label="Agregar una unidad">+</button>' +
        "</div>" +
        (m.barcode ? '<p class="barcode">Código: ' + escapeHtml(m.barcode) + "</p>" : "") +
        '<div class="med-actions">' +
          '<button class="link-btn" type="button" data-action="edit" data-id="' + m.id + '">Editar</button>' +
          '<button class="link-btn danger" type="button" data-action="delete" data-id="' + m.id + '">Eliminar</button>' +
        "</div>" +
      "</div></li>";
  }).join("");
}

/* ---------- Guardar / editar / eliminar ---------- */
function resetForm() {
  $("medForm").reset();
  $("editingId").value = "";
  $("stockInput").value = "1";
  $("formTitle").textContent = "Registrar medicamento";
  $("cancelEditBtn").hidden = true;
  showNameOrigin("");
}

function saveMedicine(e) {
  e.preventDefault();
  var name = $("nameInput").value.trim();
  var use = $("useInput").value.trim();
  var expiry = $("expiryInput").value;
  var stock = Math.max(0, Math.floor(Number($("stockInput").value) || 0));
  var barcode = $("barcodeInput").value.replace(/\D/g, "");
  if (!name || !use || !expiry) { toast("Completa nombre, uso y fecha de caducidad."); return; }

  var id = $("editingId").value;
  if (id) {
    var existing = store.medicines.find(function (m) { return m.id === id; });
    if (!existing) { resetForm(); return; }
    existing.name = name; existing.brand = $("brandInput").value.trim();
    existing.use = use; existing.expiry = expiry; existing.stock = stock; existing.barcode = barcode;
    existing.updatedAt = new Date().toISOString();
  } else {
    store.medicines.push({
      id: uid(), name: name, brand: $("brandInput").value.trim(),
      use: use, expiry: expiry, stock: stock, barcode: barcode,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    });
  }

  // Aprender el nombre para ese código: la próxima vez se llena solo.
  if (barcode && name) {
    store.links[barcode] = { name: name, brand: $("brandInput").value.trim() };
  }
  saveStore();
  render();
  resetForm();
  toast("Medicamento guardado.");
}

function editMedicine(id) {
  var m = store.medicines.find(function (x) { return x.id === id; });
  if (!m) return;
  closeScanner();
  $("editingId").value = m.id;
  $("nameInput").value = m.name || "";
  $("brandInput").value = m.brand || "";
  $("useInput").value = m.use || "";
  $("expiryInput").value = m.expiry || "";
  $("stockInput").value = String(m.stock);
  $("barcodeInput").value = m.barcode || "";
  $("formTitle").textContent = "Editar medicamento";
  $("cancelEditBtn").hidden = false;
  if (m.barcode && store.links[m.barcode]) showNameOrigin("Tu registro anterior");
  else showNameOrigin("");
  $("formSection").scrollIntoView({ behavior: "smooth", block: "start" });
  $("nameInput").focus();
}

function deleteMedicine(id) {
  var m = store.medicines.find(function (x) { return x.id === id; });
  if (!m) return;
  if (!window.confirm("¿Eliminar “" + m.name + "” del inventario?")) return;
  store.medicines = store.medicines.filter(function (x) { return x.id !== id; });
  saveStore();
  render();
  toast("Medicamento eliminado.");
}

function changeStock(id, delta) {
  var m = store.medicines.find(function (x) { return x.id === id; });
  if (!m) return;
  m.stock = Math.max(0, Number(m.stock) + delta);
  m.updatedAt = new Date().toISOString();
  saveStore();
  render();
}

/* ---------- Respaldo exportar / importar ---------- */
function exportBackup() {
  var blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inventario-medicamentos-respaldo.json";
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function importBackup(file) {
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function () {
    try {
      var data = JSON.parse(String(reader.result));
      if (!data || !Array.isArray(data.medicines)) throw new Error("formato");
      if (!window.confirm("Esto reemplazará tu inventario actual con el respaldo. ¿Continuar?")) return;
      store = { medicines: data.medicines, links: (data.links && typeof data.links === "object") ? data.links : {} };
      saveStore();
      render();
      toast("Respaldo importado.");
    } catch (e) {
      toast("Ese archivo no es un respaldo válido.");
    }
  };
  reader.readAsText(file);
}

/* ---------- Avisos ---------- */
function updateNotifyButton() {
  var btn = $("notifyBtn");
  if (!("Notification" in window)) { btn.textContent = "Avisos no disponibles"; btn.disabled = true; return; }
  btn.textContent = Notification.permission === "granted" ? "Avisos activados" : "Activar avisos";
}

async function requestNotifications() {
  if (!("Notification" in window)) { toast("Este navegador no soporta avisos."); return; }
  var perm = await Notification.requestPermission();
  updateNotifyButton();
  if (perm === "granted") { toast("Avisos activados. Aparecerán al abrir la app."); checkExpiries(true); }
  else toast("Los avisos quedaron desactivados.");
}

function checkExpiries(notify) {
  var c = counts();
  if (notify && "Notification" in window && Notification.permission === "granted" && (c.soon > 0 || c.expired > 0)) {
    try {
      new Notification("Inventario de Medicamentos", {
        body: (c.expired > 0 ? c.expired + " vencido(s). " : "") + (c.soon > 0 ? c.soon + " por vencer en 30 días o menos." : ""),
        icon: "./icon-512.png"
      });
    } catch (e) { /* notificaciones bloqueadas por el navegador */ }
  }
  return c;
}

/* ---------- Utilidades ---------- */
var toastTimer = null;
function toast(msg) {
  var t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
}

function setFilter(f) {
  currentFilter = f;
  render();
}

/* ---------- Inicio ---------- */
document.addEventListener("DOMContentLoaded", function () {
  render();
  updateNotifyButton();
  checkExpiries(true);

  $("scanBtn").addEventListener("click", openScanner);
  $("closeScannerBtn").addEventListener("click", closeScanner);
  $("manualBtn").addEventListener("click", function () { handleBarcode($("manualCode").value); });
  $("manualCode").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); handleBarcode(e.target.value); } });
  $("barcodeInput").addEventListener("change", function () {
    var code = $("barcodeInput").value.replace(/\D/g, "");
    if (code && !$("nameInput").value.trim()) handleBarcode(code);
  });

  $("medForm").addEventListener("submit", saveMedicine);
  $("cancelEditBtn").addEventListener("click", resetForm);
  $("searchInput").addEventListener("input", function (e) { searchTerm = e.target.value; render(); });

  document.querySelectorAll("[data-filter]").forEach(function (el) {
    el.addEventListener("click", function () { setFilter(el.dataset.filter); });
  });

  $("medicineList").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var action = btn.dataset.action, id = btn.dataset.id;
    if (action === "plus") changeStock(id, 1);
    else if (action === "minus") changeStock(id, -1);
    else if (action === "edit") editMedicine(id);
    else if (action === "delete") deleteMedicine(id);
  });

  $("exportBtn").addEventListener("click", exportBackup);
  $("importBtn").addEventListener("click", function () { $("importFile").click(); });
  $("importFile").addEventListener("change", function (e) { importBackup(e.target.files[0]); e.target.value = ""; });
  $("notifyBtn").addEventListener("click", requestNotifications);

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }
});
