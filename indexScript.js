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

        // Get UV index and forecast using OneCall API
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
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    document.getElementById('weather-icon').src = iconUrl;
    document.getElementById('weather-icon').alt = weather.weather[0].description;
    
    // Update temperature range
    document.getElementById('temp-high').textContent = Math.round(weather.main.temp_max);
    document.getElementById('temp-low').textContent = Math.round(weather.main.temp_min);
    
    // Update feels like
    document.getElementById('feels-like').textContent = Math.round(weather.main.feels_like);
    
    // Update weather description
    document.getElementById('weather-desc').textContent = 
        weather.weather[0].description.charAt(0).toUpperCase() + 
        weather.weather[0].description.slice(1);

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
}

function getAQIDescription(aqi) {
    const descriptions = {
        1: "Good - Ideal air quality for outdoor activities.",
        2: "Fair - Moderate air quality, fine for most people.",
        3: "Moderate - Some pollutants, sensitive individuals may experience effects.",
        4: "Poor - Unhealthy for sensitive groups, limit prolonged outdoor activity.",
        5: "Very Poor - Unhealthy air quality, minimize outdoor activities."
    };
    return descriptions[aqi] || "Unknown air quality";
}

function getUVIDescription(uvi) {
    if (uvi <= 2) return "Low exposure risk. No protection needed for most people.";
    if (uvi <= 5) return "Moderate UV levels. Wear sunscreen if staying outside for extended periods.";
    if (uvi <= 7) return "High exposure. Wear sunscreen, protective clothing, and seek shade during midday hours.";
    if (uvi <= 10) return "Very high exposure. Take extra precautions and minimize sun exposure between 10am-4pm.";
    return "Extreme exposure. Avoid being outside during midday hours and take all precautions.";
}

function searchByCity(city) {
    try {
        document.getElementById('error-message').style.display = 'none';
        fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`
        )
        .then(response => {
            if (!response.ok) {
                throw new Error(`Geocoding API error: ${response.status}`);
            }
            return response.json();
        })
        .then(geoData => {
            if (geoData.length === 0) {
                throw new Error(`City "${city}" not found`);
            }
            
            const { lat, lon } = geoData[0];
            getWeatherData(lat, lon);
        })
        .catch(error => {
            console.error('Error searching by city:', error);
            document.getElementById('error-message').textContent = `Error: ${error.message}`;
            document.getElementById('error-message').style.display = 'block';
        });
    } catch (error) {
        console.error('Error in searchByCity:', error);
        document.getElementById('error-message').textContent = `Error: ${error.message}`;
        document.getElementById('error-message').style.display = 'block';
    }
}

// Event listener for location button
document.getElementById('location-button').addEventListener('click', getCurrentLocation);

// Load weather data on page load
document.addEventListener('DOMContentLoaded', () => {
    getCurrentLocation();
});