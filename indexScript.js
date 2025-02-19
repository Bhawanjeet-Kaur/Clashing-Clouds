// Replace with your OpenWeatherMap API key
const API_KEY = '7815610bef246b80a750709bf13a81b1';
        
async function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => getWeatherData(position.coords.latitude, position.coords.longitude),
            error => {
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
        // Get current weather
        const weatherResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const weatherData = await weatherResponse.json();

        // Get air pollution data
        const airResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
        );
        const airData = await airResponse.json();

        // Get UV index and forecast
        const oneCallResponse = await fetch(
            `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        const oneCallData = await oneCallResponse.json();

        updateUI(weatherData, airData, oneCallData);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        alert('Error fetching weather data. Please try again later.');
    }
}

function updateUI(weather, air, oneCall) {
    // Update main temperature
    document.getElementById('current-temp').textContent = 
        `${Math.round(weather.main.temp)}°C`;
    
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

    // Update AQI
    const aqiValue = air.list[0].main.aqi;
    document.getElementById('aqi-value').textContent = aqiValue;
    document.getElementById('aqi-desc').textContent = getAQIDescription(aqiValue);

    // Update UVI
    const uviValue = Math.round(oneCall.current.uvi);
    document.getElementById('uvi-value').textContent = uviValue;
    document.getElementById('uvi-desc').textContent = getUVIDescription(uviValue);

    // Update bottom cards
    document.getElementById('humidity-wind').innerHTML = `
        <h3>Current Conditions</h3>
        <p>Humidity: ${weather.main.humidity}%</p>
        <p>Wind Speed: ${weather.wind.speed} m/s</p>
        <p>Pressure: ${weather.main.pressure} hPa</p>
    `;

    // Update forecast
    const tomorrow = oneCall.daily[1];
    document.getElementById('forecast').innerHTML = `
        <h3>Tomorrow's Forecast</h3>
        <p>Temperature: ${Math.round(tomorrow.temp.day)}°C</p>
        <p>Weather: ${tomorrow.weather[0].description}</p>
        <p>Chance of Rain: ${Math.round(tomorrow.pop * 100)}%</p>
    `;
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

// Load weather data on page load
getCurrentLocation();