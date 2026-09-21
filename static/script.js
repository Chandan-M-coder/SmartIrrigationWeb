const API_URL = "https://smartirrigation1.onrender.com";

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
    water: 72,
    prediction: "IRRIGATION REQUIRED"
};


/* ==============================
   HISTORY
============================== */

function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.history) || "[]");
}

function saveHistory(history) {
    localStorage.setItem(
        STORAGE_KEYS.history,
        JSON.stringify(history.slice(0, 30))
    );
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


/* ==============================
   SETTINGS
============================== */

function getSettings() {
    return JSON.parse(
        localStorage.getItem(STORAGE_KEYS.settings) ||
        '{"threshold":35,"autoMode":false}'
    );
}


/* ==============================
   CROP SELECTION
============================== */

function updateCrop() {
    const crop = document.getElementById("cropSelect").value;
    const currentCrop = document.getElementById("currentCrop");

    if (currentCrop) {
        currentCrop.textContent = crop;
    }

    localStorage.setItem("smartIrrigationCrop", crop);

    addHistory(
        "Crop changed",
        `Selected ${crop}`
    );

    showToast(`Crop updated to ${crop}`);

    // Run AI prediction using new crop
    getAIPrediction();
}


/* ==============================
   AI DETAILS
============================== */

function showDetails() {

    const prediction = sensorState.prediction;

    if (prediction === "IRRIGATION REQUIRED") {

        alert(
            `AI Prediction: Irrigation is recommended.\n\n` +
            `Soil Moisture: ${sensorState.soil}%\n` +
            `Temperature: ${sensorState.temperature}°C\n` +
            `Humidity: ${sensorState.humidity}%\n` +
            `Rain: ${sensorState.rain ? "Detected" : "No Rain"}\n` +
            `Water Level: ${sensorState.water}%`
        );

    } else {

        alert(
            `AI Prediction: Irrigation is not currently required.\n\n` +
            `Soil Moisture: ${sensorState.soil}%\n` +
            `Temperature: ${sensorState.temperature}°C\n` +
            `Humidity: ${sensorState.humidity}%\n` +
            `Rain: ${sensorState.rain ? "Detected" : "No Rain"}\n` +
            `Water Level: ${sensorState.water}%`
        );
    }
}


/* ==============================
   MODALS
============================== */

function openModal(id) {

    const modal = document.getElementById(id);

    if (!modal) return;

    modal.classList.add("show");

    if (id === "historyModal") {
        renderHistory();
    }

    if (id === "alertsModal") {
        renderAlerts();
    }

    if (id === "settingsModal") {
        loadSettings();
    }
}

function closeModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove("show");
    }
}

function closeOnBackdrop(event, id) {

    if (event.target.id === id) {
        closeModal(id);
    }
}


/* ==============================
   HISTORY DISPLAY
============================== */

function renderHistory() {

    const container = document.getElementById("historyList");

    if (!container) return;

    const history = getHistory();

    if (!history.length) {

        container.innerHTML =
            '<div class="empty-state">No irrigation history yet.</div>';

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


/* ==============================
   ALERTS
============================== */

function renderAlerts() {

    const container = document.getElementById("alertsList");

    if (!container) return;

    const settings = getSettings();

    const alerts = [];

    if (sensorState.soil < settings.threshold) {

        alerts.push({
            type: "warning",
            title: "Low soil moisture",
            text:
                `Soil moisture is ${sensorState.soil}%, ` +
                `below your ${settings.threshold}% threshold.`
        });
    }

    if (sensorState.water < 25) {

        alerts.push({
            type: "warning",
            title: "Low water level",
            text:
                `Tank water level is ${sensorState.water}%.`
        });
    }

    if (sensorState.rain) {

        alerts.push({
            type: "info",
            title: "Rain detected",
            text:
                "Automatic irrigation should remain off while rain is detected."
        });
    }

    if (isPumpOn()) {

        alerts.push({
            type: "info",
            title: "Pump running",
            text:
                "The dashboard pump state is currently ON."
        });
    }

    if (!alerts.length) {

        container.innerHTML =
            '<div class="empty-state">✓ No active alerts.</div>';

        return;
    }

    container.innerHTML = alerts.map(alert => `
        <div class="alert-item ${alert.type}">
            <strong>${escapeHtml(alert.title)}</strong>
            <span>${escapeHtml(alert.text)}</span>
        </div>
    `).join("");
}


/* ==============================
   CLEAR HISTORY
============================== */

function clearHistory() {

    localStorage.removeItem(STORAGE_KEYS.history);

    renderHistory();

    showToast("History cleared");
}


/* ==============================
   SETTINGS
============================== */

function loadSettings() {

    const settings = getSettings();

    const thresholdInput =
        document.getElementById("thresholdInput");

    const autoModeInput =
        document.getElementById("autoModeInput");

    if (thresholdInput) {
        thresholdInput.value = settings.threshold;
    }

    if (autoModeInput) {
        autoModeInput.checked = settings.autoMode;
    }
}

function saveSettings() {

    const threshold = Math.min(
        99,
        Math.max(
            1,
            Number(
                document.getElementById("thresholdInput").value
            ) || 35
        )
    );

    const autoMode =
        document.getElementById("autoModeInput").checked;

    localStorage.setItem(
        STORAGE_KEYS.settings,
        JSON.stringify({
            threshold,
            autoMode
        })
    );

    addHistory(
        "Settings updated",
        `Moisture threshold ${threshold}%, auto mode ${autoMode ? "ON" : "OFF"}`
    );

    closeModal("settingsModal");

    renderAlerts();

    showToast("Settings saved");
}


/* ==============================
   PUMP DEMO
============================== */

function isPumpOn() {

    return localStorage.getItem(
        STORAGE_KEYS.pump
    ) === "on";
}

function togglePump(forceState = null) {

    const nextState =
        forceState === null
            ? !isPumpOn()
            : forceState;

    localStorage.setItem(
        STORAGE_KEYS.pump,
        nextState ? "on" : "off"
    );

    updatePumpUI();

    addHistory(
        nextState
            ? "Pump turned ON"
            : "Pump turned OFF",
        "Manual dashboard control"
    );

    renderAlerts();

    showToast(
        nextState
            ? "Pump is ON"
            : "Pump is OFF"
    );
}

function updatePumpUI() {

    const on = isPumpOn();

    const status =
        document.getElementById("pumpStatus");

    const indicator =
        document.getElementById("pumpIndicator");

    const button =
        document.getElementById("pumpToggle");

    if (!status || !indicator || !button) {
        return;
    }

    status.textContent =
        on ? "Pump ON" : "Pump OFF";

    indicator.classList.toggle("on", on);
    indicator.classList.toggle("off", !on);

    button.classList.toggle("on", on);
    button.classList.toggle("off", !on);

    button.textContent =
        on
            ? "Turn Pump OFF"
            : "Turn Pump ON";
}


/* ==================================================
   ML API CONNECTION
================================================== */

async function getAIPrediction() {

    try {

        const cropSelect =
            document.getElementById("cropSelect");

        const plant =
            cropSelect
                ? cropSelect.value
                : localStorage.getItem("smartIrrigationCrop") || "Tomato";


        const requestData = {

            plant: plant,

            soil_moisture:
                Number(sensorState.soil),

            temperature:
                Number(sensorState.temperature),

            humidity:
                Number(sensorState.humidity),

            rain:
                sensorState.rain ? 1 : 0,

            water_level:
                Number(sensorState.water)
        };


        console.log(
            "Sending data to ML API:",
            requestData
        );


        const response = await fetch(
            `${API_URL}/predict`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(requestData)
            }
        );


        if (!response.ok) {

            throw new Error(
                `API Error: ${response.status}`
            );
        }


        const result =
            await response.json();


        console.log(
            "ML API response:",
            result
        );


        if (result.prediction) {

            sensorState.prediction =
                result.prediction;

            updatePredictionUI();

            addHistory(
                "AI prediction",
                `${plant}: ${result.prediction}`
            );

            showToast(
                "AI prediction updated"
            );
        }

    }

    catch (error) {

        console.error(
            "ML prediction error:",
            error
        );

        showToast(
            "Unable to connect to AI model"
        );
    }
}


/* ==============================
   UPDATE AI PREDICTION UI
============================== */

function updatePredictionUI() {

    const prediction =
        document.getElementById("prediction");

    const predictionText =
        document.getElementById("predictionText");


    if (prediction) {

        prediction.textContent =
            sensorState.prediction;
    }


    if (predictionText) {

        if (
            sensorState.prediction ===
            "IRRIGATION REQUIRED"
        ) {

            predictionText.textContent =
                "AI recommends irrigation based on the current field conditions.";

        } else {

            predictionText.textContent =
                "AI indicates that irrigation is not currently required.";
        }
    }
}


/* ==================================================
   REFRESH SENSOR DATA
================================================== */

async function refreshData() {

    /*
       TEMPORARY TEST MODE

       This generates sensor values locally.

       Later we will replace this section
       with real LoRa gateway data.
    */

    sensorState.soil =
        Math.max(
            15,
            Math.min(
                80,
                sensorState.soil +
                Math.floor(Math.random() * 9) - 4
            )
        );

    sensorState.temperature =
        Math.max(
            18,
            Math.min(
                40,
                sensorState.temperature +
                Math.floor(Math.random() * 5) - 2
            )
        );

    sensorState.humidity =
        Math.max(
            35,
            Math.min(
                90,
                sensorState.humidity +
                Math.floor(Math.random() * 7) - 3
            )
        );

    sensorState.water =
        Math.max(
            10,
            Math.min(
                100,
                sensorState.water +
                Math.floor(Math.random() * 5) - 2
            )
        );


    updateSensorUI();

    addHistory(
        "Sensor data refreshed",
        `Soil ${sensorState.soil}%, temperature ${sensorState.temperature}°C`
    );

    renderAlerts();

    showToast(
        "Sensor data refreshed"
    );


    /*
       Send updated values to ML model
    */

    await getAIPrediction();
}


/* ==============================
   SENSOR UI
============================== */

function updateSensorUI() {

    const soilValue =
        document.getElementById("soilValue");

    const temperatureValue =
        document.getElementById("temperatureValue");

    const humidityValue =
        document.getElementById("humidityValue");

    const rainValue =
        document.getElementById("rainValue");

    const waterValue =
        document.getElementById("waterValue");


    const tableSoil =
        document.getElementById("tableSoil");

    const tableTemp =
        document.getElementById("tableTemp");

    const tableHumidity =
        document.getElementById("tableHumidity");

    const tableRain =
        document.getElementById("tableRain");

    const tableWater =
        document.getElementById("tableWater");


    /* Dashboard cards */

    if (soilValue) {
        soilValue.textContent =
            `${sensorState.soil}%`;
    }

    if (temperatureValue) {
        temperatureValue.textContent =
            `${sensorState.temperature}°C`;
    }

    if (humidityValue) {
        humidityValue.textContent =
            `${sensorState.humidity}%`;
    }

    if (rainValue) {
        rainValue.textContent =
            sensorState.rain
                ? "Yes"
                : "No";
    }

    if (waterValue) {
        waterValue.textContent =
            `${sensorState.water}%`;
    }


    /* Recent sensor table */

    if (tableSoil) {
        tableSoil.textContent =
            `${sensorState.soil}%`;
    }

    if (tableTemp) {
        tableTemp.textContent =
            `${sensorState.temperature}°C`;
    }

    if (tableHumidity) {
        tableHumidity.textContent =
            `${sensorState.humidity}%`;
    }

    if (tableRain) {
        tableRain.textContent =
            sensorState.rain
                ? "Yes"
                : "No";
    }

    if (tableWater) {
        tableWater.textContent =
            `${sensorState.water}%`;
    }
}


/* ==============================
   TOAST
============================== */

function showToast(message) {

    let toast =
        document.getElementById("toast");

    if (!toast) {

        toast =
            document.createElement("div");

        toast.id = "toast";
        toast.className = "toast";

        document.body.appendChild(toast);
    }

    toast.textContent =
        message;

    toast.classList.add("show");

    clearTimeout(
        window.toastTimer
    );

    window.toastTimer =
        setTimeout(
            () => toast.classList.remove("show"),
            2200
        );
}


/* ==============================
   SECURITY
============================== */

function escapeHtml(value) {

    return String(value).replace(
        /[&<>'"]/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char])
    );
}


/* ==================================================
   PAGE LOAD
================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        const savedCrop =
            localStorage.getItem(
                "smartIrrigationCrop"
            );


        if (savedCrop) {

            const select =
                document.getElementById(
                    "cropSelect"
                );

            const currentCrop =
                document.getElementById(
                    "currentCrop"
                );

            if (select) {
                select.value =
                    savedCrop;
            }

            if (currentCrop) {
                currentCrop.textContent =
                    savedCrop;
            }
        }


        updatePumpUI();

        updateSensorUI();

        updatePredictionUI();


        /*
           Automatically run AI prediction
           when dashboard opens.
        */

        getAIPrediction();


        /*
           ESC key closes modals
        */

        document.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    document
                        .querySelectorAll(
                            ".modal.show"
                        )
                        .forEach(
                            modal =>
                                modal.classList.remove("show")
                        );
                }
            }
        );
    }
);
