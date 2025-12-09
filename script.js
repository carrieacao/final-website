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
        'Clear': '#5b7bdb',
        'Clouds': '#7a8a9e',
        'Rain': '#4a6b8a',
        'Drizzle': '#6b9cb8',
        'Thunderstorm': '#3d5a7a',
        'Snow': '#8a9ba8',
        'Mist': '#6b7a88',
        'Fog': '#6b7a88'
    };
    
    return backgrounds[weatherMain] || '#5b7bdb';
}

function convertTemp(temp, fromUnit, toUnit) {
    if (fromUnit === toUnit) return temp;
    
    if (toUnit === 'metric') {
        // Convert F to C
        return (temp - 32) * 5/9;
    } else {
        // Convert C to F
        return (temp * 9/5) + 32;
    }
}

function formatTime(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getUnitSymbol() {
    return currentUnit === 'imperial' ? 'F' : 'C';
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
    const unitSymbol = getUnitSymbol();
    
    // Update hero section
    document.getElementById('cityName').textContent = `${data.name}, ${data.sys.country}`;
    document.getElementById('mainTemp').textContent = Math.round(data.main.temp);
    document.getElementById('feelsLike').textContent = Math.round(data.main.feels_like);
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    
    // Update temperature unit symbols
    document.querySelector('.temp-unit').textContent = `°${unitSymbol}`;
    document.querySelector('.feels-like').innerHTML = `Feels like <span id="feelsLike">${Math.round(data.main.feels_like)}</span>°${unitSymbol}`;
    
    // Update weather icon
    const icon = getWeatherIcon(data.weather[0].icon, data.weather[0].description);
    document.getElementById('weatherIcon').textContent = icon;
    
    // Update background
    const background = getBackgroundForWeather(data.weather[0].main);
    heroWeather.style.background = background;
    
    // Update BODY background based on weather
    updateBodyBackground(data.weather[0].main);
    
    // Update info cards
    document.getElementById('humidity').textContent = `${data.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${Math.round(data.wind.speed)} ${currentUnit === 'imperial' ? 'mph' : 'm/s'}`;
    document.getElementById('visibility').textContent = currentUnit === 'imperial' 
        ? `${(data.visibility / 1609.34).toFixed(1)} mi`
        : `${(data.visibility / 1000).toFixed(1)} km`;
    document.getElementById('pressure').textContent = `${data.main.pressure} hPa`;
    document.getElementById('sunrise').textContent = formatTime(data.sys.sunrise);
    document.getElementById('sunset').textContent = formatTime(data.sys.sunset);
}

function displayForecast(data) {
    const unitSymbol = getUnitSymbol();
    
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
                    <span class="high">${high}°${unitSymbol}</span>
                    <span class="low">${low}°${unitSymbol}</span>
                </div>
                <div class="forecast-desc">${day.weather.description}</div>
            </div>
        `;
    }).join('');
}

function updateBodyBackground(weatherMain) {
    // Remove all weather classes
    const weatherClasses = [
        'weather-clear',
        'weather-clouds', 
        'weather-rain',
        'weather-drizzle',
        'weather-thunderstorm',
        'weather-snow',
        'weather-mist',
        'weather-fog'
    ];
    
    document.body.classList.remove(...weatherClasses);
    
    // Add appropriate weather class
    const weatherClassMap = {
        'Clear': 'weather-clear',
        'Clouds': 'weather-clouds',
        'Rain': 'weather-rain',
        'Drizzle': 'weather-drizzle',
        'Thunderstorm': 'weather-thunderstorm',
        'Snow': 'weather-snow',
        'Mist': 'weather-mist',
        'Fog': 'weather-fog',
        'Smoke': 'weather-mist',
        'Haze': 'weather-mist',
        'Dust': 'weather-mist',
        'Sand': 'weather-mist',
        'Ash': 'weather-mist',
        'Squall': 'weather-thunderstorm',
        'Tornado': 'weather-thunderstorm'
    };
    
    const weatherClass = weatherClassMap[weatherMain] || 'weather-clear';
    document.body.classList.add(weatherClass);
}

function displayRecommendations(data) {
    // Always use Fahrenheit for recommendation logic, regardless of display unit
    let tempInF = data.main.temp;
    if (currentUnit === 'metric') {
        // Convert Celsius to Fahrenheit for recommendation logic
        tempInF = (data.main.temp * 9/5) + 32;
    }
    
    const weather = data.weather[0].main;
    const recommendations = [];
    
    // Generate recommendations based on weather (using Fahrenheit thresholds)
    if (weather === 'Clear' && tempInF >= 70 && tempInF <= 85) {
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
    } else if (tempInF > 85) {
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
    } else if (tempInF < 40) {
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
    
    // What to pack suggestions (also based on Fahrenheit)
    const packItems = [];
    if (tempInF > 80) packItems.push('sunscreen', 'water bottle', 'hat');
    else if (tempInF < 50) packItems.push('jacket', 'warm layers', 'gloves');
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
    // Re-fetch all comparison cities with new unit
    const tempCities = [...comparisonCities];
    comparisonCities = [];
    
    tempCities.forEach(async (city) => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/weather?q=${city.name},${city.sys.country}&units=${currentUnit}&appid=${API_KEY}`
            );
            const data = await response.json();
            comparisonCities.push(data);
            
            // Update display after all cities are fetched
            if (comparisonCities.length === tempCities.length) {
                updateComparisonDisplay();
            }
        } catch (error) {
            console.error('Error updating comparison:', error);
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
    const unitSymbol = getUnitSymbol();
    
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
        const windUnit = currentUnit === 'imperial' ? 'mph' : 'm/s';
        const visibilityValue = currentUnit === 'imperial' 
            ? `${(city.visibility / 1609.34).toFixed(1)} mi`
            : `${(city.visibility / 1000).toFixed(1)} km`;
        
        return `
            <div class="comparison-card">
                <div class="comparison-header">
                    <div class="comparison-city">${city.name}, ${city.sys.country}</div>
                    <button class="remove-btn" onclick="removeFromComparison(${index})">×</button>
                </div>
                <div class="comparison-body">
                    <div class="weather-icon">${icon}</div>
                    <div class="comparison-temp">${Math.round(city.main.temp)}°${unitSymbol}</div>
                    <div class="comparison-condition">${city.weather[0].description}</div>
                    <div class="comparison-details">
                        <div class="detail-item">
                            <strong>Humidity</strong>
                            ${city.main.humidity}%
                        </div>
                        <div class="detail-item">
                            <strong>Wind</strong>
                            ${Math.round(city.wind.speed)} ${windUnit}
                        </div>
                        <div class="detail-item">
                            <strong>Feels Like</strong>
                            ${Math.round(city.main.feels_like)}°${unitSymbol}
                        </div>
                        <div class="detail-item">
                            <strong>Visibility</strong>
                            ${visibilityValue}
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
