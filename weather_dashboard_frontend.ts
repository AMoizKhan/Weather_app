// src/App.tsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import Favorites from './pages/Favorites';
import Analytics from './pages/Analytics';
import Login from './pages/Login';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize app
    const initApp = async () => {
      try {
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
          await navigator.serviceWorker.register('/sw.js');
        }
        
        // Initialize theme
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        setIsLoading(false);
      } catch (error) {
        console.error('App initialization failed:', error);
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-lg font-semibold">Loading Weather Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <Header />
            <main className="container mx-auto px-4 py-8">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/search" element={<Search />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/login" element={<Login />} />
              </Routes>
            </main>
            <ToastContainer 
              position="top-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

// src/components/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Sun, Moon, Cloud, User, LogOut, Menu } from 'lucide-react';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/search', label: 'Search', icon: '🔍' },
    { path: '/favorites', label: 'Favorites', icon: '⭐' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-lg border-b border-gray-200 dark:border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <Cloud className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              WeatherDash
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              ) : (
                <Sun className="h-5 w-5 text-yellow-500" />
              )}
            </button>

            {/* User Menu */}
            {user ? (
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Login
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300"
              aria-label="Toggle menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                    location.pathname === item.path
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

// src/components/WeatherCard.tsx
import React from 'react';
import { WeatherData } from '../types/weather';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer, Eye } from 'lucide-react';

interface WeatherCardProps {
  weather: WeatherData;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

const WeatherCard: React.FC<WeatherCardProps> = ({ 
  weather, 
  isFavorite = false, 
  onToggleFavorite 
}) => {
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
        return <Sun className="h-12 w-12 text-yellow-500" />;
      case 'clouds':
        return <Cloud className="h-12 w-12 text-gray-500" />;
      case 'rain':
        return <CloudRain className="h-12 w-12 text-blue-500" />;
      case 'snow':
        return <CloudSnow className="h-12 w-12 text-blue-200" />;
      default:
        return <Cloud className="h-12 w-12 text-gray-500" />;
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp >= 30) return 'text-red-500';
    if (temp >= 20) return 'text-orange-500';
    if (temp >= 10) return 'text-yellow-500';
    return 'text-blue-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">
            {weather.location}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {new Date(weather.timestamp).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        {onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className={`p-2 rounded-full transition-colors ${
              isFavorite
                ? 'text-yellow-500 bg-yellow-100 dark:bg-yellow-900'
                : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900'
            }`}
          >
            ⭐
          </button>
        )}
      </div>

      {/* Main Weather Info */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {getWeatherIcon(weather.condition)}
          <div>
            <div className={`text-4xl font-bold ${getTemperatureColor(weather.temperature)}`}>
              {Math.round(weather.temperature)}°C
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {weather.description}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500 dark:text-gray-400">Feels like</div>
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            {Math.round(weather.feelsLike)}°C
          </div>
        </div>
      </div>

      {/* Weather Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Droplets className="h-5 w-5 text-blue-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Humidity</div>
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              {weather.humidity}%
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <Wind className="h-5 w-5 text-green-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Wind</div>
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              {weather.windSpeed} km/h
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <Thermometer className="h-5 w-5 text-purple-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Pressure</div>
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              {weather.pressure} hPa
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
          <Eye className="h-5 w-5 text-orange-500" />
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Visibility</div>
            <div className="font-semibold text-gray-700 dark:text-gray-300">
              {weather.visibility} km
            </div>
          </div>
        </div>
      </div>

      {/* UV Index */}
      <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            UV Index
          </span>
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded text-xs font-bold ${
              weather.uvIndex <= 2 ? 'bg-green-500 text-white' :
              weather.uvIndex <= 5 ? 'bg-yellow-500 text-white' :
              weather.uvIndex <= 7 ? 'bg-orange-500 text-white' :
              'bg-red-500 text-white'
            }`}>
              {weather.uvIndex}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {weather.uvIndex <= 2 ? 'Low' :
               weather.uvIndex <= 5 ? 'Moderate' :
               weather.uvIndex <= 7 ? 'High' : 'Very High'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;

// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useGeolocation } from '../hooks/useGeolocation';
import { weatherService } from '../services/weatherService';
import WeatherCard from '../components/WeatherCard';
import ForecastChart from '../components/ForecastChart';
import { WeatherData, ForecastData } from '../types/weather';
import { toast } from 'react-toastify';
import { MapPin, RefreshCw, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  const [currentWeather, setCurrentWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { location, loading: locationLoading, error: locationError } = useGeolocation();

  const loadWeatherData = async (lat?: number, lon?: number, city?: string) => {
    try {
      setLoading(true);
      
      let weatherData: WeatherData;
      let forecastData: ForecastData[];
      
      if (lat && lon) {
        [weatherData, forecastData] = await Promise.all([
          weatherService.getCurrentWeatherByCoords(lat, lon),
          weatherService.getForecastByCoords(lat, lon)
        ]);
      } else if (city) {
        [weatherData, forecastData] = await Promise.all([
          weatherService.getCurrentWeather(city),
          weatherService.getForecast(city)
        ]);
      } else {
        throw new Error('No location provided');
      }

      setCurrentWeather(weatherData);
      setForecast(forecastData);
      
      toast.success('Weather data updated successfully!');
    } catch (error) {
      console.error('Failed to load weather data:', error);
      toast.error('Failed to load weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (location) {
      await loadWeatherData(location.lat, location.lon);
    } else {
      await loadWeatherData(undefined, undefined, 'Karachi');
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (location) {
      loadWeatherData(location.lat, location.lon);
    } else if (!locationLoading && locationError) {
      // Fallback to default city if geolocation fails
      loadWeatherData(undefined, undefined, 'Karachi');
    }
  }, [location, locationLoading, locationError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading weather data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Weather Dashboard
          </h1>
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
            <MapPin className="h-4 w-4" />
            <span>
              {location 
                ? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`
                : 'Karachi, Pakistan'
              }
            </span>
          </div>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Current Weather */}
      {currentWeather && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WeatherCard weather={currentWeather} />
          </div>
          
          {/* Quick Stats */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                Today's Highlights
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Air Quality</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">Good</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sunrise</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">06:42 AM</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sunset</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">07:18 PM</span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Moon Phase</span>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">🌙 Waxing</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forecast Chart */}
      {forecast.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            5-Day Forecast
          </h3>
          <ForecastChart data={forecast} />
        </div>
      )}

      {/* Hourly Forecast */}
      {forecast.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Hourly Forecast
          </h3>
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {forecast.slice(0, 8).map((item, index) => (
              <div
                key={index}
                className="flex-shrink-0 bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-w-32 text-center"
              >
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {new Date(item.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="text-2xl mb-2">
                  {item.condition === 'clear' ? '☀️' : 
                   item.condition === 'clouds' ? '☁️' : 
                   item.condition === 'rain' ? '🌧️' : '❄️'}
                </div>
                <div className="font-bold text-gray-800 dark:text-white">
                  {Math.round(item.temperature)}°
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {Math.round(item.humidity)}% humidity
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;