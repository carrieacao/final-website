// ========================================
// CONFIGURATION & GLOBAL VARIABLES
// ========================================

const API_KEY = '80919ab541798dab089d1b053367f348'; // Replace with your actual API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';

let currentUnit = 'imperial'; // 'imperial' for Fahrenheit, 'metric' for Celsius
let currentCityData = null;
let comparisonCities = [];

// DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const searchSuggestions = document.getElementById('searchSuggestions');
const heroWeather = document.getElementById('heroWeather');
const loadingState = document.querySelector('.loading-state');
const weatherDisplay = document.querySelector('.weather-display');
const unitToggle = document.getElementById('unitToggle');
const addToCompare = document.getElementById('addToCompare');
const comparisonContainer = document.getElementById('comparisonContainer');
const clearComparison = document.getElementById('clearComparison');
const forecastContainer = document.getElementById('forecastContainer');
const recommendationsContainer = document.getElementById('recommendationsContainer');

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Load default city (St. Louis)
    fetchWeatherData('St. Louis,US');
    
    // Set current date
    updateCurrentDate();
    
    // Event Listeners
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    cityInput.addEventListener('input', handleSearchInput);
    unitToggle.addEventListener('click', toggleTemperatureUnit);
    addToCompare.addEventListener('click', addCurrentCityToComparison);
    clearComparison.addEventListener('click', clearAllComparisons);
    
    // Click outside to close suggestions
    document.addEventListener('click', (e) => {
        if (!searchSuggestions.contains(e.target) && e.target !== cityInput) {
            searchSuggestions.classList.remove('active');
        }
    });
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

function updateCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
}

function getWeatherIcon(weatherCode, description) {
    // Map weather conditions to emojis
    const iconMap = {
        '01d': '☀️', // clear sky day
        '01n': '🌙', // clear sky night
        '02d': '⛅', // few clouds day
        '02n': '☁️', // few clouds night
        '03d': '☁️', // scattered clouds
        '03n': '☁️',
        '04d': '☁️', // broken clouds
        '04n': '☁️',
        '09d': '🌧️', // shower rain
        '09n': '🌧️',
        '10d': '🌦️', // rain day
        '10n': '🌧️', // rain night
        '11d': '⛈️', // thunderstorm
        '11n': '⛈️',
        '13d': '❄️', // snow
        '13n': '❄️',
        '50d': '🌫️', // mist
        '50n': '🌫️'
    };
    
    return iconMap[weatherCode] || '🌤️';
}

function getBackgroundForWeather(weatherMain) {
    // Dynamic background gradients based on weather
    const backgrounds = {
        'Clear': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'Clouds': 'linear-gradient(135deg, #757F9A 0%, #D7DDE8 100%)',
        'Rain': 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)',
        'Drizzle': 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
        'Thunderstorm': 'linear-gradient(135deg, #2c3e50 0%, #3498db 100%)',
        'Snow': 'linear-gradient(135deg, #e6dada 0%, #274046 100%)',
        'Mist': 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)',
        'Fog': 'linear-gradient(135deg, #606c88 0%, #3f4c6b 100%)'
    };
    
    return backgrounds[weatherMain] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
}

function convertTemp(temp, toUnit) {
    if (toUnit === 'celsius') {
        return Math.round((temp - 32) * 5/9);
    } else {
        return Math.round((temp * 9/5) + 32);
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ========================================
// SEARCH FUNCTIONALITY
// ========================================

function handleSearch() {
    const city = cityInput.value.trim();
    if (city) {
        fetchWeatherData(city);
        searchSuggestions.classList.remove('active');
    }
}

function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        searchSuggestions.classList.remove('active');
        return;
    }
    
    // Simple suggestions (you could expand this with a geocoding API)
    const suggestions = generateSuggestions(query);
    displaySuggestions(suggestions);
}

function generateSuggestions(query) {
    // Popular cities for quick suggestions
    const popularCities = [
        'New York, US', 'Los Angeles, US', 'Chicago, US', 'Houston, US',
        'Phoenix, US', 'Philadelphia, US', 'San Antonio, US', 'San Diego, US',
        'Dallas, US', 'San Jose, US', 'London, GB', 'Paris, FR', 'Tokyo, JP',
        'Sydney, AU', 'Berlin, DE', 'Rome, IT', 'Madrid, ES', 'Toronto, CA',
        'Mexico City, MX', 'Mumbai, IN', 'Beijing, CN', 'Moscow, RU'
    ];
    
    return popularCities.filter(city => 
        city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 5);
}

function displaySuggestions(suggestions) {
    if (suggestions.length === 0) {
        searchSuggestions.classList.remove('active');
        return;
    }
    
    searchSuggestions.innerHTML = suggestions.map(city => 
        `<div class="suggestion-item" onclick="selectSuggestion('${city}')">${city}</div>`
    ).join('');
    
    searchSuggestions.classList.add('active');
}

function selectSuggestion(city) {
    cityInput.value = city;
    fetchWeatherData(city);
    searchSuggestions.classList.remove('active');
}

// ========================================
// API CALLS
// ========================================

async function fetchWeatherData(city) {
    showLoading();
    
    try {
        // Fetch current weather
        const currentResponse = await fetch(
            `${API_BASE_URL}/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        if (!currentResponse.ok) {
            throw new Error('City not found');
        }
        
        const currentData = await currentResponse.json();
        currentCityData = currentData;
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(
            `${API_BASE_URL}/forecast?q=${city}&units=${currentUnit}&appid=${API_KEY}`
        );
        
        const forecastData = await forecastResponse.json();
        
        // Update UI
        displayCurrentWeather(currentData);
        displayForecast(forecastData);
        displayRecommendations(currentData);
        hideLoading();
        
    } catch (error) {
        console.error('Error fetching weather:', error);
        alert('Could not find weather data for this city. Please try again.');
        hideLoading();
    }
}

// ========================================
// DISPLAY FUNCTIONS
// ========================================

function showLoading() {
    loadingState.style.display = 'flex';
    weatherDisplay.style.display = 'none';
}

function hideLoading() {
    loadingState.style.display = 'none';
    weatherDisplay.style.display = 'block';
}

function displayCurrentWeather(data) {
    // Update hero section
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('mainTemp').textContent = Math.round(data.main.temp);
    document.getElementById('feelsLike').textContent = Math.round(data.main.feels_like);
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    
    // Update weather icon
    const icon = getWeatherIcon(data.weather[0].icon, data.weather[0].description);
    document.getElementById('weatherIcon').textContent = icon;
    
    // Update background
    const background = getBackgroundForWeather(data.weather[0].main);
    heroWeather.style.background = background;
    
    // Update info cards
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed)} mph`;
    document.getElementById('visibility').textContent = `${(data.visibility / 1609.34).toFixed(1)} mi`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(data.sys.sunset);
}

function displayForecast(data) {
    // Group forecast data by day
    const dailyForecasts = {};
    
    data.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const dateKey = date.toLocaleDateString('en-US');
        
        if (!dailyForecasts[dateKey]) {
            dailyForecasts[dateKey] = {
                date: date,
                temps: [],
                weather: item.weather[0],
                data: item
            };
        }
        dailyForecasts[dateKey].temps.push(item.main.temp);
    });
    
    // Display first 5 days
    const days = Object.values(dailyForecasts).slice(0, 5);
    
    forecastContainer.innerHTML = days.map(day => {
        const high = Math.round(Math.max(...day.temps));
        const low = Math.round(Math.min(...day.temps));
        const dayName = day.date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const icon = getWeatherIcon(day.weather.icon, day.weather.description);
        
        return `
            <div class="forecast-card">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-date">${dateStr}</div>
                <div class="forecast-icon">${icon}</div>
                <div class="forecast-temp">
                    <span class="high">${high}°</span>
                    <span class="low">${low}°</span>
                </div>
                <div class="forecast-desc">${day.weather.description}</div>
            </div>
        `;
    }).join('');
}

function displayRecommendations(data) {
    const temp = data.main.temp;
    const weather = data.weather[0].main;
    const recommendations = [];
    
    // Generate recommendations based on weather
    if (weather === 'Clear' && temp >= 70 && temp <= 85) {
        recommendations.push({
            icon: '🥾',
            title: 'Perfect for Hiking',
            description: 'Great weather for outdoor adventures. Don\'t forget your sunscreen!'
        });
        recommendations.push({
            icon: '📸',
            title: 'Ideal for Sightseeing',
            description: 'Beautiful conditions for exploring the city and taking photos.'
        });
    } else if (weather === 'Rain' || weather === 'Drizzle') {
        recommendations.push({
            icon: '🏛️',
            title: 'Museum Day',
            description: 'Perfect weather to explore indoor attractions and museums.'
        });
        recommendations.push({
            icon: '☕',
            title: 'Cozy Café Time',
            description: 'Great day to relax in a warm café with a good book.'
        });
    } else if (weather === 'Snow') {
        recommendations.push({
            icon: '⛷️',
            title: 'Winter Sports',
            description: 'Excellent conditions for skiing, snowboarding, or sledding!'
        });
        recommendations.push({
            icon: '❄️',
            title: 'Winter Wonderland',
            description: 'Bundle up and enjoy the scenic snowy landscapes.'
        });
    } else if (temp > 85) {
        recommendations.push({
            icon: '🏖️',
            title: 'Beach or Pool Day',
            description: 'Stay cool by the water. Remember to stay hydrated!'
        });
        recommendations.push({
            icon: '🍦',
            title: 'Indoor Activities',
            description: 'Consider air-conditioned venues to beat the heat.'
        });
    } else if (temp < 40) {
        recommendations.push({
            icon: '🧥',
            title: 'Layer Up',
            description: 'Bundle up with warm layers and enjoy winter activities.'
        });
        recommendations.push({
            icon: '🔥',
            title: 'Cozy Indoor Time',
            description: 'Perfect weather for staying warm indoors.'
        });
    } else {
        recommendations.push({
            icon: '🚶',
            title: 'Great Walking Weather',
            description: 'Comfortable temperatures for outdoor exploration.'
        });
        recommendations.push({
            icon: '🎨',
            title: 'Versatile Day',
            description: 'Mild conditions suitable for both indoor and outdoor activities.'
        });
    }
    
    // What to pack suggestions
    const packItems = [];
    if (temp > 80) packItems.push('sunscreen', 'water bottle', 'hat');
    else if (temp < 50) packItems.push('jacket', 'warm layers', 'gloves');
    else packItems.push('light jacket', 'comfortable shoes');
    
    if (weather === 'Rain' || weather === 'Drizzle') {
        packItems.push('umbrella', 'rain jacket');
    }
    
    recommendations.push({
        icon: '🎒',
        title: 'What to Pack',
        description: `Essentials: ${packItems.join(', ')}.`
    });
    
    // Display recommendations
    recommendationsContainer.innerHTML = recommendations.map(rec => `
        <div class="recommendation-card">
            <div class="rec-icon">${rec.icon}</div>
            <div class="rec-title">${rec.title}</div>
            <div class="rec-description">${rec.description}</div>
        </div>
    `).join('');
}

// ========================================
// TEMPERATURE UNIT TOGGLE
// ========================================

function toggleTemperatureUnit() {
    const options = unitToggle.querySelectorAll('.unit-option');
    
    if (currentUnit === 'imperial') {
        currentUnit = 'metric';
        options[0].classList.remove('active');
        options[1].classList.add('active');
    } else {
        currentUnit = 'imperial';
        options[1].classList.remove('active');
        options[0].classList.add('active');
    }
    
    // Refresh weather data with new unit
    if (currentCityData) {
        const cityName = `${currentCityData.name},${currentCityData.sys.country}`;
        fetchWeatherData(cityName);
    }
    
    // Update comparison cards
    updateComparisonUnits();
}

function updateComparisonUnits() {
    comparisonCities.forEach((city, index) => {
        const card = comparisonContainer.children[index];
        if (card && !card.classList.contains('empty-state')) {
            const tempElement = card.querySelector('.comparison-temp');
            const currentTemp = parseInt(tempElement.textContent);
            const newTemp = currentUnit === 'metric' ? 
                convertTemp(currentTemp, 'celsius') : 
                convertTemp(currentTemp, 'fahrenheit');
            tempElement.textContent = `${newTemp}°`;
        }
    });
}

// ========================================
// CITY COMPARISON FUNCTIONALITY
// ========================================

function addCurrentCityToComparison() {
    if (!currentCityData) {
        alert('Please search for a city first!');
        return;
    }
    
    // Check if city already exists in comparison
    const exists = comparisonCities.some(city => 
        city.name === currentCityData.name && city.sys.country === currentCityData.sys.country
    );
    
    if (exists) {
        alert('This city is already in your comparison!');
        return;
    }
    
    // Limit to 4 cities for comparison
    if (comparisonCities.length >= 4) {
        alert('Maximum 4 cities for comparison. Remove one to add another.');
        return;
    }
    
    comparisonCities.push(currentCityData);
    updateComparisonDisplay();
    
    // Scroll to comparison section
    document.querySelector('.comparison-section').scrollIntoView({ behavior: 'smooth' });
}

function updateComparisonDisplay() {
    if (comparisonCities.length === 0) {
        comparisonContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🗺️</div>
                <p>No cities added yet</p>
                <p class="empty-subtitle">Search for cities and add them to compare weather conditions</p>
            </div>
        `;
        return;
    }
    
    comparisonContainer.innerHTML = comparisonCities.map((city, index) => {
        const icon = getWeatherIcon(city.weather[0].icon, city.weather[0].description);
        
        return `
            <div class="comparison-card">
                <div class="comparison-header">
                    <div class="comparison-city">${city.name}, ${city.sys.country}</div>
                    <button class="remove-btn" onclick="removeFromComparison(${index})">×</button>
                </div>
                <div class="comparison-body">
                    <div class="weather-icon">${icon}</div>
                    <div class="comparison-temp">${Math.round(city.main.temp)}°</div>
                    <div class="comparison-condition">${city.weather[0].description}</div>
                    <div class="comparison-details">
                        <div class="detail-item">
                            <strong>Humidity</strong>
                            ${city.main.humidity}%
                        </div>
                        <div class="detail-item">
                            <strong>Wind</strong>
                            ${Math.round(city.wind.speed)} mph
                        </div>
                        <div class="detail-item">
                            <strong>Feels Like</strong>
                            ${Math.round(city.main.feels_like)}°
                        </div>
                        <div class="detail-item">
                            <strong>Visibility</strong>
                            ${(city.visibility / 1609.34).toFixed(1)} mi
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function removeFromComparison(index) {
    comparisonCities.splice(index, 1);
    updateComparisonDisplay();
}

function clearAllComparisons() {
    if (comparisonCities.length === 0) return;
    
    if (confirm('Remove all cities from comparison?')) {
        comparisonCities = [];
        updateComparisonDisplay();
    }
}

// ========================================
// ERROR HANDLING
// ========================================

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    alert('An error occurred. Please try again.');
});