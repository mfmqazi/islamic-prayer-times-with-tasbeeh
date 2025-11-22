// ========================================
// STATE MANAGEMENT
// ========================================
const state = {
    location: {
        city: '',
        country: '',
        latitude: null,
        longitude: null
    },
    settings: {
        calculationMethod: 3, // Muslim World League
        asrMethod: 0, // 0 = Standard (Shafi), 1 = Hanafi
        timeFormat: 12
    },
    tasbeehCount: 0,
    prayerTimes: null,
    currentPrayer: null
};

// ========================================
// PRAYER ICONS
// ========================================
const prayerIcons = {
    Fajr: '🌅',
    Sunrise: '🌄',
    Dhuhr: '☀️',
    Asr: '🌤️',
    Sunset: '🌆',
    Maghrib: '🌇',
    Isha: '🌙',
    Imsak: '🌌',
    Midnight: '🌃',
    Firstthird: '✨',
    Lastthird: '⭐'
};

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    initializeEventListeners();
    detectLocation();
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
});

// ========================================
// EVENT LISTENERS
// ========================================
function initializeEventListeners() {
    // Settings Modal
    document.getElementById('settingsBtn').addEventListener('click', () => {
        openModal('settingsModal');
    });

    document.getElementById('closeSettingsBtn').addEventListener('click', () => {
        closeModal('settingsModal');
    });

    document.getElementById('calculationMethod').addEventListener('change', (e) => {
        state.settings.calculationMethod = parseInt(e.target.value);
        saveSettings();
        fetchPrayerTimes();
    });

    document.getElementById('asrMethod').addEventListener('change', (e) => {
        state.settings.asrMethod = parseInt(e.target.value);
        saveSettings();
        fetchPrayerTimes();
    });

    document.getElementById('timeFormat').addEventListener('change', (e) => {
        state.settings.timeFormat = parseInt(e.target.value);
        saveSettings();
        fetchPrayerTimes();
    });

    // Location Modal
    document.getElementById('changeLocationBtn').addEventListener('click', () => {
        openModal('locationModal');
    });

    document.getElementById('closeLocationBtn').addEventListener('click', () => {
        closeModal('locationModal');
    });

    // City Dropdown - Instant Update on Selection
    document.getElementById('citySelect').addEventListener('change', (e) => {
        const value = e.target.value;

        if (value === 'current') {
            // Use current location via geolocation
            closeModal('locationModal');
            detectLocation();
        } else {
            // Parse city,country from dropdown value
            const [city, country] = value.split(',');
            if (city && country) {
                state.location.city = city.trim();
                state.location.country = country.trim();
                state.location.latitude = null;
                state.location.longitude = null;
                updateLocationText(`${city.trim()}, ${country.trim()}`);
                fetchPrayerTimes();
                closeModal('locationModal');
            }
        }
    });

    // Tasbeeh Modal
    const tasbeehBtn = document.getElementById('tasbeehBtn');
    if (tasbeehBtn) {
        tasbeehBtn.addEventListener('click', () => {
            openModal('tasbeehModal');
            updateTasbeehDisplay();
        });
    }

    const closeTasbeehBtn = document.getElementById('closeTasbeehBtn');
    if (closeTasbeehBtn) {
        closeTasbeehBtn.addEventListener('click', () => {
            closeModal('tasbeehModal');
        });
    }

    const tasbeehCountBtn = document.getElementById('tasbeehCountBtn');
    if (tasbeehCountBtn) {
        tasbeehCountBtn.addEventListener('click', () => {
            state.tasbeehCount++;
            updateTasbeehDisplay();
            saveTasbeehCount();
        });
    }

    const tasbeehResetBtn = document.getElementById('tasbeehResetBtn');
    if (tasbeehResetBtn) {
        tasbeehResetBtn.addEventListener('click', () => {
            if (confirm('Reset Tasbeeh counter?')) {
                state.tasbeehCount = 0;
                updateTasbeehDisplay();
                saveTasbeehCount();
            }
        });
    }

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

// ========================================
// MODAL FUNCTIONS
// ========================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ========================================
// LOCATION DETECTION
// ========================================
function detectLocation() {
    updateLocationText('Detecting location...');

    if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                state.location.latitude = position.coords.latitude;
                state.location.longitude = position.coords.longitude;

                // Get city name from coordinates
                await getCityFromCoordinates(state.location.latitude, state.location.longitude);
                fetchPrayerTimes();
            },
            (error) => {
                console.error('Geolocation error:', error);
                // Default to a major city
                state.location.city = 'New York';
                state.location.country = 'USA';
                updateLocationText('New York, USA');
                fetchPrayerTimes();
            }
        );
    } else {
        // Geolocation not supported, use default
        state.location.city = 'New York';
        state.location.country = 'USA';
        updateLocationText('New York, USA');
        fetchPrayerTimes();
    }
}

async function getCityFromCoordinates(lat, lon) {
    try {
        const response = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=${state.settings.calculationMethod}`);
        const data = await response.json();

        if (data.code === 200 && data.data.meta) {
            const meta = data.data.meta;
            state.location.city = meta.timezone || 'Unknown';
            state.location.country = '';
            updateLocationText(meta.timezone || 'Current Location');
        }
    } catch (error) {
        console.error('Error getting city name:', error);
        updateLocationText('Current Location');
    }
}

function updateLocationText(text) {
    document.getElementById('locationText').textContent = text;
}

// ========================================
// DATE & TIME FUNCTIONS
// ========================================
function updateDateTime() {
    const now = new Date();

    // Gregorian date
    const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    document.getElementById('gregorianDate').textContent = now.toLocaleDateString('en-US', options);
}

function updateHijriDate(hijriDate) {
    if (hijriDate) {
        document.getElementById('hijriDate').textContent = `${hijriDate.day} ${hijriDate.month.en} ${hijriDate.year} AH`;
    }
}

// ========================================
// FETCH PRAYER TIMES
// ========================================
async function fetchPrayerTimes() {
    try {
        let url;

        if (state.location.latitude && state.location.longitude) {
            url = `https://api.aladhan.com/v1/timings?latitude=${state.location.latitude}&longitude=${state.location.longitude}&method=${state.settings.calculationMethod}&school=${state.settings.asrMethod}`;
        } else if (state.location.city && state.location.country) {
            url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(state.location.city)}&country=${encodeURIComponent(state.location.country)}&method=${state.settings.calculationMethod}&school=${state.settings.asrMethod}`;
        } else {
            return;
        }

        const response = await fetch(url);
        const data = await response.json();

        if (data.code === 200) {
            state.prayerTimes = data.data.timings;
            updateHijriDate(data.data.date.hijri);

            // Update location text if using coordinates
            if (data.data.meta && data.data.meta.timezone) {
                const locationText = state.location.city
                    ? `${state.location.city}${state.location.country ? ', ' + state.location.country : ''}`
                    : data.data.meta.timezone;
                updateLocationText(locationText);
            }

            displayPrayerTimes();
            determineCurrentPrayer();
        } else {
            console.error('API error:', data);
        }
    } catch (error) {
        console.error('Error fetching prayer times:', error);
    }
}

// ========================================
// DISPLAY PRAYER TIMES
// ========================================
function displayPrayerTimes() {
    if (!state.prayerTimes) return;

    const times = state.prayerTimes;

    // Daily Prayers
    const dailyPrayers = [
        { name: 'Fajr', time: times.Fajr, icon: prayerIcons.Fajr },
        { name: 'Sunrise', time: times.Sunrise, icon: prayerIcons.Sunrise },
        { name: 'Dhuhr', time: times.Dhuhr, icon: prayerIcons.Dhuhr },
        { name: 'Asr', time: times.Asr, icon: prayerIcons.Asr },
        { name: 'Maghrib', time: times.Maghrib, icon: prayerIcons.Maghrib },
        { name: 'Isha', time: times.Isha, icon: prayerIcons.Isha }
    ];

    renderPrayerList('dailyPrayers', dailyPrayers);

    // Nafl Prayers
    const naflPrayers = [
        {
            name: 'Ishraq',
            time: calculateIshraq(times.Sunrise),
            timeRange: calculateIshraqRange(times.Sunrise, times.Dhuhr),
            icon: '🌅'
        },
        {
            name: 'Chasht',
            time: calculateChasht(times.Sunrise, times.Dhuhr),
            timeRange: calculateChashtRange(times.Sunrise, times.Dhuhr),
            icon: '🌤️'
        },

        {
            name: 'Awwabin',
            time: calculateAwwabin(times.Maghrib, times.Isha),
            timeRange: calculateAwwabinRange(times.Maghrib, times.Isha),
            icon: '🌆'
        },
        {
            name: 'Tahajjud',
            time: calculateTahajjud(times.Isha, times.Fajr),
            timeRange: calculateTahajjudRange(times.Isha, times.Fajr),
            icon: '⭐'
        }
    ];

    renderPrayerList('naflPrayers', naflPrayers);

    // Forbidden Times
    const forbiddenTimes = [
        {
            name: 'Sunrise',
            time: times.Sunrise,
            timeRange: calculateSunriseForbidden(times.Sunrise),
            icon: '🌄'
        },
        {
            name: 'Zawal',
            time: calculateZawal(times.Dhuhr),
            timeRange: calculateZawalRange(times.Dhuhr),
            icon: '☀️'
        },
        {
            name: 'Sunset',
            time: times.Sunset,
            timeRange: calculateSunsetForbidden(times.Sunset),
            icon: '🌇'
        }
    ];

    renderPrayerList('forbiddenTimes', forbiddenTimes);
}

function renderPrayerList(containerId, prayers) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    prayers.forEach(prayer => {
        const item = document.createElement('div');
        item.className = 'prayer-item';

        if (prayer.name === state.currentPrayer) {
            item.classList.add('active');
        }

        const nameContainer = document.createElement('div');
        nameContainer.className = 'prayer-name-container';

        const icon = document.createElement('span');
        icon.className = 'prayer-icon';
        icon.textContent = prayer.icon;

        const name = document.createElement('span');
        name.className = 'prayer-name';
        name.textContent = prayer.name;

        nameContainer.appendChild(icon);
        nameContainer.appendChild(name);

        const timeContainer = document.createElement('div');
        timeContainer.className = 'prayer-time-container';

        const time = document.createElement('span');
        time.className = 'prayer-time';
        time.textContent = formatTime(prayer.time);

        timeContainer.appendChild(time);

        if (prayer.timeRange) {
            const range = document.createElement('span');
            range.className = 'prayer-time-range';
            range.textContent = prayer.timeRange;
            timeContainer.appendChild(range);
        }

        item.appendChild(nameContainer);
        item.appendChild(timeContainer);
        container.appendChild(item);
    });
}

// ========================================
// TIME CALCULATIONS
// ========================================
function formatTime(time24) {
    if (state.settings.timeFormat === 24) {
        return time24;
    }

    const [hours, minutes] = time24.split(':');
    let h = parseInt(hours);
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${minutes} ${period}`;
}

function addMinutes(time, minutes) {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function calculateIshraq(sunrise) {
    return addMinutes(sunrise, 15);
}

function calculateIshraqRange(sunrise, dhuhr) {
    const start = addMinutes(sunrise, 15);
    const end = addMinutes(dhuhr, -10);
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function calculateChasht(sunrise, dhuhr) {
    // Chasht starts approximately 45 minutes after sunrise
    return addMinutes(sunrise, 45);
}

function calculateChashtRange(sunrise, dhuhr) {
    const start = addMinutes(sunrise, 45);
    const end = addMinutes(dhuhr, -15);
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function calculateZawal(dhuhr) {
    return addMinutes(dhuhr, -10);
}

function calculateZawalRange(dhuhr) {
    const start = addMinutes(dhuhr, -10);
    const end = addMinutes(dhuhr, 10);
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function calculateAwwabin(maghrib, isha) {
    return addMinutes(maghrib, 5);
}

function calculateAwwabinRange(maghrib, isha) {
    const start = addMinutes(maghrib, 5);
    return `${formatTime(start)} - ${formatTime(isha)}`;
}

function calculateTahajjud(isha, fajr) {
    const [ishaH, ishaM] = isha.split(':').map(Number);
    const [fajrH, fajrM] = fajr.split(':').map(Number);

    let ishaMinutes = ishaH * 60 + ishaM;
    let fajrMinutes = fajrH * 60 + fajrM;

    // Handle midnight crossing
    if (fajrMinutes < ishaMinutes) {
        fajrMinutes += 24 * 60;
    }

    const tahajjudMinutes = ishaMinutes + ((fajrMinutes - ishaMinutes) * 2 / 3);
    const hours = Math.floor(tahajjudMinutes / 60) % 24;
    const minutes = Math.floor(tahajjudMinutes % 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function calculateTahajjudRange(isha, fajr) {
    const start = calculateTahajjud(isha, fajr);
    return `${formatTime(start)} - ${formatTime(fajr)}`;
}

function calculateSunriseForbidden(sunrise) {
    const start = sunrise;
    const end = addMinutes(sunrise, 20);
    return `${formatTime(start)} - ${formatTime(end)}`;
}

function calculateSunsetForbidden(sunset) {
    const start = addMinutes(sunset, -10);
    const end = addMinutes(sunset, 20);
    return `${formatTime(start)} - ${formatTime(end)}`;
}

// ========================================
// DETERMINE CURRENT PRAYER
// ========================================
function determineCurrentPrayer() {
    if (!state.prayerTimes) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const prayers = [
        { name: 'Fajr', time: state.prayerTimes.Fajr },
        { name: 'Dhuhr', time: state.prayerTimes.Dhuhr },
        { name: 'Asr', time: state.prayerTimes.Asr },
        { name: 'Maghrib', time: state.prayerTimes.Maghrib },
        { name: 'Isha', time: state.prayerTimes.Isha }
    ];

    for (let i = 0; i < prayers.length; i++) {
        const [hours, minutes] = prayers[i].time.split(':').map(Number);
        const prayerMinutes = hours * 60 + minutes;

        const nextPrayer = prayers[i + 1];
        if (nextPrayer) {
            const [nextHours, nextMinutes] = nextPrayer.time.split(':').map(Number);
            const nextPrayerMinutes = nextHours * 60 + nextMinutes;

            if (currentMinutes >= prayerMinutes && currentMinutes < nextPrayerMinutes) {
                state.currentPrayer = prayers[i].name;
                return;
            }
        } else {
            // After Isha
            if (currentMinutes >= prayerMinutes) {
                state.currentPrayer = prayers[i].name;
                return;
            }
        }
    }

    // Before Fajr
    state.currentPrayer = 'Isha';
}

// ========================================
// SETTINGS PERSISTENCE
// ========================================
function saveSettings() {
    localStorage.setItem('islamicHubSettings', JSON.stringify(state.settings));
}

function loadSettings() {
    const saved = localStorage.getItem('islamicHubSettings');
    if (saved) {
        state.settings = JSON.parse(saved);
        document.getElementById('calculationMethod').value = state.settings.calculationMethod;
        document.getElementById('asrMethod').value = state.settings.asrMethod || 0;
        document.getElementById('timeFormat').value = state.settings.timeFormat;
    }

    // Load Tasbeeh count
    const savedTasbeeh = localStorage.getItem('tasbeehCount');
    if (savedTasbeeh) {
        state.tasbeehCount = parseInt(savedTasbeeh, 10);
        updateTasbeehDisplay();
    }
}

// ========================================
// TASBEEH HELPER FUNCTIONS
// ========================================
function updateTasbeehDisplay() {
    const display = document.getElementById('tasbeehCount');
    if (display) {
        display.textContent = state.tasbeehCount;
    }
}

function saveTasbeehCount() {
    localStorage.setItem('tasbeehCount', state.tasbeehCount);
}

