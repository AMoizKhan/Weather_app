// server.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { errorHandler, notFound } from './middleware/errorMiddleware';
import { logger } from './utils/logger';

// Routes
import authRoutes from './routes/authRoutes';
import weatherRoutes from './routes/weatherRoutes';
import userRoutes from './routes/userRoutes';
import analyticsRoutes from './routes/analyticsRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https://openweathermap.org"],
      scriptSrc: ["'self'"],
    },
  },
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000'],
  credentials: true,
}));

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', {
  stream: { write: (message) => logger.info(message.trim()) }
}));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/user', userRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Database Connection
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/weather-dashboard';
    await mongoose.connect(mongoURI);
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error('MongoDB connection failed:', error);
    process.exit(1);
  }
};

// Graceful Shutdown
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, closing HTTP server...');
  server.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start Server
const server = app.listen(PORT, async () => {
  await connectDB();
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API Documentation available at http://localhost:${PORT}/docs`);
});

export default app;

// routes/weatherRoutes.ts
import express from 'express';
import { body, param, query } from 'express-validator';
import { validate } from '../middleware/validation';
import { auth } from '../middleware/authMiddleware';
import { weatherController } from '../controllers/weatherController';

const router = express.Router();

/**
 * @swagger
 * /api/weather/current/{location}:
 *   get:
 *     summary: Get current weather for a location
 *     tags: [Weather]
 *     parameters:
 *       - in: path
 *         name: location
 *         required: true
 *         schema:
 *           type: string
 *         description: City name or coordinates
 *     responses:
 *       200:
 *         description: Current weather data
 */
router.get('/current/:location', 
  param('location').notEmpty().withMessage('Location is required'),
  validate,
  weatherController.getCurrentWeather
);

router.get('/current/coords/:lat/:lon',
  param('lat').isFloat().withMessage('Invalid latitude'),
  param('lon').isFloat().withMessage('Invalid longitude'),
  validate,
  weatherController.getCurrentWeatherByCoords
);

router.get('/forecast/:location',
  param('location').notEmpty().withMessage('Location is required'),
  validate,
  weatherController.getForecast
);

router.get('/forecast/coords/:lat/:lon',
  param('lat').isFloat().withMessage('Invalid latitude'),
  param('lon').isFloat().withMessage('Invalid longitude'),
  validate,
  weatherController.getForecastByCoords
);

router.get('/history/:location',
  auth,
  param('location').notEmpty().withMessage('Location is required'),
  query('days').optional().isInt({ min: 1, max: 30 }).withMessage('Days must be between 1-30'),
  validate,
  weatherController.getHistoricalWeather
);

router.get('/alerts/:location',
  param('location').notEmpty().withMessage('Location is required'),
  validate,
  weatherController.getWeatherAlerts
);

export default router;

// controllers/weatherController.ts
import { Request, Response } from 'express';
import { weatherService } from '../services/weatherService';
import { cacheService } from '../services/cacheService';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

class WeatherController {
  async getCurrentWeather(req: Request, res: Response) {
    try {
      const { location } = req.params;
      const cacheKey = `weather:current:${location}`;
      
      // Check cache first
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const weather = await weatherService.getCurrentWeather(location);
      
      // Cache for 10 minutes
      await cacheService.set(cacheKey, weather, 600);
      
      res.json(weather);
    } catch (error) {
      logger.error('getCurrentWeather error:', error);
      throw new ApiError(500, 'Failed to fetch weather data');
    }
  }

  async getCurrentWeatherByCoords(req: Request, res: Response) {
    try {
      const { lat, lon } = req.params;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      const cacheKey = `weather:coords:${latitude}:${longitude}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const weather = await weatherService.getCurrentWeatherByCoords(latitude, longitude);
      await cacheService.set(cacheKey, weather, 600);
      
      res.json(weather);
    } catch (error) {
      logger.error('getCurrentWeatherByCoords error:', error);
      throw new ApiError(500, 'Failed to fetch weather data');
    }
  }

  async getForecast(req: Request, res: Response) {
    try {
      const { location } = req.params;
      const cacheKey = `forecast:${location}`;
      
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const forecast = await weatherService.getForecast(location);
      await cacheService.set(cacheKey, forecast, 1800); // 30 minutes
      
      res.json(forecast);
    } catch (error) {
      logger.error('getForecast error:', error);
      throw new ApiError(500, 'Failed to fetch forecast data');
    }
  }

  async getForecastByCoords(req: Request, res: Response) {
    try {
      const { lat, lon } = req.params;
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      const cacheKey = `forecast:coords:${latitude}:${longitude}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const forecast = await weatherService.getForecastByCoords(latitude, longitude);
      await cacheService.set(cacheKey, forecast, 1800);
      
      res.json(forecast);
    } catch (error) {
      logger.error('getForecastByCoords error:', error);
      throw new ApiError(500, 'Failed to fetch forecast data');
    }
  }

  async getHistoricalWeather(req: Request, res: Response) {
    try {
      const { location } = req.params;
      const days = parseInt(req.query.days as string) || 7;
      
      const cacheKey = `history:${location}:${days}`;
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const history = await weatherService.getHistoricalWeather(location, days);
      await cacheService.set(cacheKey, history, 3600); // 1 hour
      
      res.json(history);
    } catch (error) {
      logger.error('getHistoricalWeather error:', error);
      throw new ApiError(500, 'Failed to fetch historical weather data');
    }
  }

  async getWeatherAlerts(req: Request, res: Response) {
    try {
      const { location } = req.params;
      
      const alerts = await weatherService.getWeatherAlerts(location);
      res.json(alerts);
    } catch (error) {
      logger.error('getWeatherAlerts error:', error);
      throw new ApiError(500, 'Failed to fetch weather alerts');
    }
  }
}

export const weatherController = new WeatherController();

// services/weatherService.ts
import axios from 'axios';
import { WeatherData, ForecastData, HistoricalData, WeatherAlert } from '../types/weather';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';

class WeatherService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    
    if (!this.apiKey) {
      logger.error('OpenWeather API key not provided');
      throw new Error('OpenWeather API key is required');
    }
  }

  async getCurrentWeather(location: string): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      return this.transformWeatherData(response.data);
    } catch (error) {
      logger.error('Failed to fetch current weather:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new ApiError(404, 'Location not found');
      }
      throw new ApiError(500, 'Weather service unavailable');
    }
  }

  async getCurrentWeatherByCoords(lat: number, lon: number): Promise<WeatherData> {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      return this.transformWeatherData(response.data);
    } catch (error) {
      logger.error('Failed to fetch weather by coordinates:', error);
      throw new ApiError(500, 'Weather service unavailable');
    }
  }

  async getForecast(location: string): Promise<ForecastData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          q: location,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      return this.transformForecastData(response.data);
    } catch (error) {
      logger.error('Failed to fetch forecast:', error);
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new ApiError(404, 'Location not found');
      }
      throw new ApiError(500, 'Weather service unavailable');
    }
  }

  async getForecastByCoords(lat: number, lon: number): Promise<ForecastData[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat,
          lon,
          appid: this.apiKey,
          units: 'metric'
        },
        timeout: 10000
      });

      return this.transformForecastData(response.data);
    } catch (error) {
      logger.error('Failed to fetch forecast by coordinates:', error);
      throw new ApiError(500, 'Weather service unavailable');
    }
  }

  async getHistoricalWeather(location: string, days: number): Promise<HistoricalData[]> {
    // Note: This would require a premium OpenWeather plan
    // For demo purposes, we'll generate mock historical data
    try {
      const historicalData: HistoricalData[] = [];
      const currentDate = new Date();
      
      for (let i = days; i > 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        
        historicalData.push({
          date: date.toISOString(),
          temperature: 20 + Math.random() * 15,
          humidity: 40 + Math.random() * 40,
          windSpeed: Math.random() * 20,
          condition: ['clear', 'clouds', 'rain'][Math.floor(Math.random() * 3)],
          description: 'Historical weather data'
        });
      }
      
      return historicalData;
    } catch (error) {
      logger.error('Failed to fetch historical weather:', error);
      throw new ApiError(500, 'Historical weather service unavailable');
    }
  }

  async getWeatherAlerts(location: string): Promise<WeatherAlert[]> {
    try {
      // Mock implementation - in production, integrate with weather alert APIs
      const alerts: WeatherAlert[] = [];
      
      // Add sample alert if conditions warrant
      const randomAlert = Math.random();
      if (randomAlert > 0.8) {
        alerts.push({
          id: 'alert_001',
          title: 'Heat Wave Warning',
          description: 'Extremely high temperatures expected. Stay hydrated and avoid prolonged sun exposure.',
          severity: 'moderate',
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          area: location
        });
      }
      
      return alerts;
    } catch (error) {
      logger.error('Failed to fetch weather alerts:', error);
      throw new ApiError(500, 'Weather alerts service unavailable');
    }
  }

  private transformWeatherData(data: any): WeatherData {
    return {
      location: data.name,
      country: data.sys.country,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed * 3.6, // Convert m/s to km/h
      windDirection: data.wind.deg,
      visibility: data.visibility / 1000, // Convert m to km
      uvIndex: Math.floor(Math.random() * 11), // Mock UV index
      condition: data.weather[0].main.toLowerCase(),
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: new Date().toISOString(),
      coordinates: {
        lat: data.coord.lat,
        lon: data.coord.lon
      }
    };
  }

  private transformForecastData(data: any): ForecastData[] {
    return data.list.map((item: any) => ({
      date: item.dt_txt,
      temperature: item.main.temp,
      feelsLike: item.main.feels_like,
      humidity: item.main.humidity,
      pressure: item.main.pressure,
      windSpeed: item.wind.speed * 3.6,
      condition: item.weather[0].main.toLowerCase(),
      description: item.weather[0].description,
      icon: item.weather[0].icon,
      precipitationProbability: item.pop * 100
    }));
  }
}

export const weatherService = new WeatherService();