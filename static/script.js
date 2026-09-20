const STORAGE_KEYS = {
    history: "smartIrrigationHistory",
    settings: "smartIrrigationSettings",
    pump: "smartIrrigationPump"
};

let sensorState = {
    soil: 32,
    temperature: 29,
    humidity: 64,
    rain: false,
    water: 72
};

function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
}

function saveHistory(history) {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history.slice(0, 30)));
}

function addHistory(action, details) {
    const history = getHistory();
    history.unshift({
        time: new Date().toLocaleString(),
        action,
        details
    });
    saveHistory(history);
}

function getSettings() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) || '{"threshold":35,"autoMode":false}');
}

function updateCrop() {
    const crop = document.getElementById("cropSelect").value;
    const currentCrop = document.getElementById("currentCrop");

    if (currentCrop) currentCrop.textContent = crop;
    localStorage.setItem("smartIrrigationCrop", crop);
    addHistory("Crop changed", `Selected ${crop}`);
    showToast(`Crop updated to ${crop}`);
}

function showDetails() {
    const settings = getSettings();
    const needWater = sensorState.soil < settings.threshold && !sensorState.rain;
    alert(
        needWater
            ? `AI Prediction: Irrigation is recommended. Soil moisture is ${sensorState.soil}% and the alert threshold is ${settings.threshold}%.`
            : `AI Prediction: Irrigation is not currently required. Soil moisture is ${sensorState.soil}%.`
    );
}

function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add("show");
    if (id === "historyModal") renderHistory();
    if (id === "alertsModal") renderAlerts();
    if (id === "settingsModal") loadSettings();
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove("show");
}

function closeOnBackdrop(event, id) {
    if (event.target.id === id) closeModal(id);
}

function renderHistory() {
    const container = document.getElementById("historyList");
    const history = getHistory();

    if (!history.length) {
        container.innerHTML = '<div class="empty-state">No irrigation history yet.</div>';
        return;
    }

    container.innerHTML = history.map(item => `
        <div class="history-item">
            <strong>${escapeHtml(item.action)}</strong>
            <span>${escapeHtml(item.details)}</span>
            <small>${escapeHtml(item.time)}</small>
        </div>
    `).join("");
}

function renderAlerts() {
    const container = document.getElementById("alertsList");
    const settings = getSettings();
    const alerts = [];

    if (sensorState.soil < settings.threshold) {
        alerts.push({ type: "warning", title: "Low soil moisture", text: `Soil moisture is ${sensorState.soil}%, below your ${settings.threshold}% threshold.` });
    }
    if (sensorState.water < 25) {
        alerts.push({ type: "warning", title: "Low water level", text: `Tank water level is ${sensorState.water}%.` });
    }
    if (sensorState.rain) {
        alerts.push({ type: "info", title: "Rain detected", text: "Automatic irrigation should remain off while rain is detected." });
    }
    if (isPumpOn()) {
        alerts.push({ type: "info", title: "Pump running", text: "The dashboard pump state is currently ON." });
    }

    if (!alerts.length) {
        container.innerHTML = '<div class="empty-state">✓ No active alerts.</div>';
        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <strong>${escapeHtml(alert.title)}</strong>
            <span>${escapeHtml(alert.text)}</span>
        </div>
    `).join("");
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEYS.history);
    renderHistory();
    showToast("History cleared");
}

function loadSettings() {
    const settings = getSettings();
    document.getElementById("thresholdInput").value = settings.threshold;
    document.getElementById("autoModeInput").checked = settings.autoMode;
}

function saveSettings() {
    const threshold = Math.min(99, Math.max(1, Number(document.getElementById("thresholdInput").value) || 35));
    const autoMode = document.getElementById("autoModeInput").checked;

    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ threshold, autoMode }));
    addHistory("Settings updated", `Moisture threshold ${threshold}%, auto mode ${autoMode ? "ON" : "OFF"}`);
    closeModal("settingsModal");
    renderAlerts();
    showToast("Settings saved");
}

function isPumpOn() {
    return localStorage.getItem(STORAGE_KEYS.pump) === "on";
}

function togglePump(forceState = null) {
    const nextState = forceState === null ? !isPumpOn() : forceState;
    localStorage.setItem(STORAGE_KEYS.pump, nextState ? "on" : "off");
    updatePumpUI();

    addHistory(
        nextState ? "Pump turned ON" : "Pump turned OFF",
        nextState ? "Manual dashboard control" : "Manual dashboard control"
    );

    renderAlerts();
    showToast(nextState ? "Pump is ON" : "Pump is OFF");
}

function updatePumpUI() {
    const on = isPumpOn();
    const status = document.getElementById("pumpStatus");
    const indicator = document.getElementById("pumpIndicator");
    const button = document.getElementById("pumpToggle");

    if (!status || !indicator || !button) return;

    status.textContent = on ? "Pump ON" : "Pump OFF";
    indicator.classList.toggle("on", on);
    indicator.classList.toggle("off", !on);
    button.classList.toggle("on", on);
    button.classList.toggle("off", !on);
    button.textContent = on ? "Turn Pump OFF" : "Turn Pump ON";
}

function refreshData() {
    sensorState.soil = Math.max(15, Math.min(80, sensorState.soil + Math.floor(Math.random() * 9) - 4));
    sensorState.temperature = Math.max(18, Math.min(40, sensorState.temperature + Math.floor(Math.random() * 5) - 2));
    sensorState.humidity = Math.max(35, Math.min(90, sensorState.humidity + Math.floor(Math.random() * 7) - 3));
    sensorState.water = Math.max(10, Math.min(100, sensorState.water + Math.floor(Math.random() * 5) - 2));

    updateSensorUI();
    addHistory("Sensor data refreshed", `Soil ${sensorState.soil}%, temperature ${sensorState.temperature}°C`);
    renderAlerts();
    showToast("Sensor data refreshed");
}

function updateSensorUI() {
    const soil = document.getElementById("tableSoil");
    const temp = document.getElementById("tableTemp");
    const humidity = document.getElementById("tableHumidity");
    const water = document.getElementById("tableWater");

    if (soil) soil.textContent = `${sensorState.soil}%`;
    if (temp) temp.textContent = `${sensorState.temperature}°C`;
    if (humidity) humidity.textContent = `${sensorState.humidity}%`;
    if (water) water.textContent = `${sensorState.water}%`;
}

function showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[char]));
}

document.addEventListener("DOMContentLoaded", () => {
    const savedCrop = localStorage.getItem("smartIrrigationCrop");
    if (savedCrop) {
        const select = document.getElementById("cropSelect");
        const currentCrop = document.getElementById("currentCrop");
        if (select) select.value = savedCrop;
        if (currentCrop) currentCrop.textContent = savedCrop;
    }

    updatePumpUI();
    updateSensorUI();

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            document.querySelectorAll(".modal.show").forEach(modal => modal.classList.remove("show"));
        }
    });
});
