// Replace with your OpenWeatherMap API key
const API_KEY = '818bf3305a73d00e2641b1e69bb4179f';
        
async function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => getWeatherData(position.coords.latitude, position.coords.longitude),
            error => {
                console.error('Geolocation error:', error);
                alert('Unable to get location. Using default location.');
                getWeatherData(51.5074, -0.1278); // Default to London
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
        getWeatherData(51.5074, -0.1278); // Default to London
    }
}

async function getWeatherData(lat, lon) {
    try {
        // Show loading indicator
        document.getElementById('weather-container').classList.add('loading');
        
        // Get current weather
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        
        if (!weatherResponse.ok) {
            throw new Error(`Weather API error: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();
        console.log('Weather data:', weatherData);

        // Get air pollution data
        const airResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        
        if (!airResponse.ok) {
            throw new Error(`Air pollution API error: ${airResponse.status}`);
        }
        
        const airData = await airResponse.json();
        console.log('Air pollution data:', airData);

        // Get UV index and forecast using OneCall API 3.0
        // Note: If there's an issue with OneCall 3.0, we'll handle it gracefully
        try {
            const oneCallResponse = await fetch(
                `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly&appid=${API_KEY}`
            );
            
            if (!oneCallResponse.ok) {
                throw new Error(`OneCall API error: ${oneCallResponse.status}`);
            }
            
            const oneCallData = await oneCallResponse.json();
            console.log('OneCall data:', oneCallData);
            updateUI(weatherData, airData, oneCallData);
        } catch (oneCallError) {
            console.error('Error with OneCall 3.0, trying OneCall 2.5:', oneCallError);
            
            // Fallback to OneCall 2.5 if 3.0 fails
            const oneCallResponse = await fetch(
                `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=metric&exclude=minutely,hourly&appid=${API_KEY}`
            );
            
            if (!oneCallResponse.ok) {
                throw new Error(`OneCall 2.5 API error: ${oneCallResponse.status}`);
            }
            
            const oneCallData = await oneCallResponse.json();
            console.log('OneCall 2.5 data:', oneCallData);
            updateUI(weatherData, airData, oneCallData);
        }
    } catch (error) {
        console.error('Error fetching weather data:', error);
        document.getElementById('error-message').textContent = 
            `Error: ${error.message}. Please try again later.`;
        document.getElementById('error-message').style.display = 'block';
    } finally {
        // Hide loading indicator
        document.getElementById('weather-container').classList.remove('loading');
    }
}

function updateUI(weather, air, oneCall) {
    // Clear any previous error messages
    document.getElementById('error-message').style.display = 'none';
    
    // Update location
    document.getElementById('location').textContent = weather.name;
    
    // Update main temperature
    document.getElementById('current-temp').textContent = 
        `${Math.round(weather.main.temp)}°C`;
    
    // Update weather icon
    const iconCode = weather.weather[0].icon;
    document.getElementById('weather-icon').src = 
        `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    document.getElementById('weather-icon').alt = weather.weather[0].description;
    
    // Update temperature range
    document.getElementById('temp-range').innerHTML = 
        `High: ${Math.round(weather.main.temp_max)}°C<br>
         Low: ${Math.round(weather.main.temp_min)}°C`;
    
    // Update feels like
    document.getElementById('feels-like').textContent = 
        `Feels like: ${Math.round(weather.main.feels_like)}°C`;
    
    // Update weather description
    document.getElementById('weather-desc').textContent = 
        weather.weather[0].description.charAt(0).toUpperCase() + 
        weather.weather[0].description.slice(1);

    // Update timestamp
    const timestamp = new Date(weather.dt * 1000);
    document.getElementById('timestamp').textContent = 
        `Last updated: ${timestamp.toLocaleTimeString()}`;

    // Update AQI if available
    if (air && air.list && air.list.length > 0) {
        const aqiValue = air.list[0].main.aqi;
        document.getElementById('aqi-value').textContent = aqiValue;
        document.getElementById('aqi-desc').textContent = getAQIDescription(aqiValue);
        document.getElementById('aqi-container').style.display = 'block';
    } else {
        document.getElementById('aqi-container').style.display = 'none';
    }

    // Update UVI if available
    if (oneCall && oneCall.current && oneCall.current.uvi !== undefined) {
        const uviValue = Math.round(oneCall.current.uvi);
        document.getElementById('uvi-value').textContent = uviValue;
        document.getElementById('uvi-desc').textContent = getUVIDescription(uviValue);
        document.getElementById('uvi-container').style.display = 'block';
    } else {
        document.getElementById('uvi-container').style.display = 'none';
    }

    // Update bottom cards
    document.getElementById('humidity-wind').innerHTML = `
        <h3>Current Conditions</h3>
        <p><i class="fas fa-tint"></i> Humidity: ${weather.main.humidity}%</p>
        <p><i class="fas fa-wind"></i> Wind: ${weather.wind.speed} m/s</p>
        <p><i class="fas fa-compress-alt"></i> Pressure: ${weather.main.pressure} hPa</p>
        <p><i class="fas fa-eye"></i> Visibility: ${weather.visibility / 1000} km</p>
    `;

    // Update forecast if available
    if (oneCall && oneCall.daily && oneCall.daily.length > 1) {
        const tomorrow = oneCall.daily[1];
        document.getElementById('forecast').innerHTML = `
            <h3>Tomorrow's Forecast</h3>
            <p><i class="fas fa-temperature-high"></i> High: ${Math.round(tomorrow.temp.max)}°C</p>
            <p><i class="fas fa-temperature-low"></i> Low: ${Math.round(tomorrow.temp.min)}°C</p>
            <p><i class="fas fa-cloud"></i> ${tomorrow.weather[0].description}</p>
            <p><i class="fas fa-umbrella"></i> Chance of Rain: ${Math.round((tomorrow.pop || 0) * 100)}%</p>
        `;
    } else {
        document.getElementById('forecast').innerHTML = `<h3>Forecast Unavailable</h3>`;
    }

    // Update 5-day forecast if element exists
    if (document.getElementById('five-day-forecast') && oneCall && oneCall.daily) {
        const fiveDayContainer = document.getElementById('five-day-forecast');
        fiveDayContainer.innerHTML = '<h3>5-Day Forecast</h3><div class="forecast-days"></div>';
        const forecastDays = fiveDayContainer.querySelector('.forecast-days');
        
        // Start from index 1 to skip current day
        for (let i = 1; i < Math.min(6, oneCall.daily.length); i++) {
            const day = oneCall.daily[i];
            const date = new Date(day.dt * 1000);
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            
            const dayEl = document.createElement('div');
            dayEl.className = 'forecast-day';
            dayEl.innerHTML = `
                <div class="day-name">${dayName}</div>
                <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
                <div class="day-temp">${Math.round(day.temp.max)}° / ${Math.round(day.temp.min)}°</div>
                <div class="day-desc">${day.weather[0].main}</div>
            `;
            forecastDays.appendChild(dayEl);
        }
    }
}

function getAQIDescription(aqi) {
    const descriptions = {
        1: "Good - Ideal air quality",
        2: "Fair - Moderate air quality",
        3: "Moderate - Some pollutants",
        4: "Poor - Unhealthy for sensitive groups",
        5: "Very Poor - Unhealthy air quality"
    };
    return descriptions[aqi] || "Unknown air quality";
}

function getUVIDescription(uvi) {
    if (uvi <= 2) return "Low exposure";
    if (uvi <= 5) return "Moderate exposure";
    if (uvi <= 7) return "High exposure";
    if (uvi <= 10) return "Very high exposure";
    return "Extreme exposure";
}

// Search by city name
document.getElementById('search-form')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const city = document.getElementById('city-input').value.trim();
    if (city) {
        searchByCity(city);
    }
});

async function searchByCity(city) {
    try {
        const geoResponse = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        );
        
        if (!geoResponse.ok) {
            throw new Error(`Geocoding API error: ${geoResponse.status}`);
        }
        
        const geoData = await geoResponse.json();
        
        if (geoData.length === 0) {
            throw new Error(`City "${city}" not found`);
        }
        
        const { lat, lon } = geoData[0];
        getWeatherData(lat, lon);
    } catch (error) {
        console.error('Error searching by city:', error);
        document.getElementById('error-message').textContent = 
            `Error: ${error.message}`;
        document.getElementById('error-message').style.display = 'block';
    }
}

// Initialize units toggle if it exists
document.getElementById('units-toggle')?.addEventListener('click', function() {
    const currentTemp = document.getElementById('current-temp').textContent;
    const isCelsius = currentTemp.includes('°C');
    
    // Toggle between Celsius and Fahrenheit
    if (isCelsius) {
        convertToFahrenheit();
        this.textContent = 'Switch to °C';
    } else {
        convertToCelsius();
        this.textContent = 'Switch to °F';
    }
});

function convertToFahrenheit() {
    // This is a simplified conversion function
    // In a real app, you should re-fetch the data or store both units
    document.querySelectorAll('[data-temp]').forEach(el => {
        const celsiusTemp = parseFloat(el.getAttribute('data-temp'));
        const fahrenheitTemp = Math.round((celsiusTemp * 9/5) + 32);
        el.textContent = `${fahrenheitTemp}°F`;
    });
}

function convertToCelsius() {
    document.querySelectorAll('[data-temp]').forEach(el => {
        const celsiusTemp = parseFloat(el.getAttribute('data-temp'));
        el.textContent = `${Math.round(celsiusTemp)}°C`;
    });
}

// Load weather data on page load
document.addEventListener('DOMContentLoaded', () => {
    // Create error message element if it doesn't exist
    if (!document.getElementById('error-message')) {
        const errorEl = document.createElement('div');
        errorEl.id = 'error-message';
        errorEl.style.display = 'none';
        errorEl.style.color = 'red';
        errorEl.style.marginTop = '10px';
        errorEl.style.textAlign = 'center';
        document.getElementById('weather-container')?.prepend(errorEl);
    }
    
    getCurrentLocation();
});