// types/weather.ts
export interface WeatherData {
  location: string;
  country: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  uvIndex: number;
  condition: string;
  description: string;
  icon: string;
  timestamp: string;
  coordinates: {
    lat: number;
    lon: number;
  };
}

export interface ForecastData {
  date: string;
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  condition: string;
  description: string;
  icon: string;
  precipitationProbability: number;
}

export interface HistoricalData {
  date: string;
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
}

export interface WeatherAlert {
  id: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  startTime: string;
  endTime: string;
  area: string;
}

export interface Location {
  lat: number;
  lon: number;
  name?: string;
  country?: string;
}

// types/user.ts
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  preferences: UserPreferences;
  favorites: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  temperatureUnit: 'celsius' | 'fahrenheit';
  windSpeedUnit: 'kmh' | 'mph' | 'ms';
  theme: 'light' | 'dark' | 'auto';
  notifications: {
    weatherAlerts: boolean;
    dailyForecast: boolean;
    extremeWeather: boolean;
  };
  defaultLocation?: Location;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

// types/analytics.ts
export interface WeatherTrend {
  date: string;
  temperature: number;
  humidity: number;
  pressure: number;
  location: string;
}

export interface LocationStats {
  location: string;
  averageTemperature: number;
  averageHumidity: number;
  totalSearches: number;
  lastSearched: string;
}

export interface UsageAnalytics {
  totalRequests: number;
  uniqueLocations: number;
  averageResponseTime: number;
  topLocations: LocationStats[];
  trends: WeatherTrend[];
}

// models/User.ts
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  preferences: {
    temperatureUnit: 'celsius' | 'fahrenheit';
    windSpeedUnit: 'kmh' | 'mph' | 'ms';
    theme: 'light' | 'dark' | 'auto';
    notifications: {
      weatherAlerts: boolean;
      dailyForecast: boolean;
      extremeWeather: boolean;
    };
    defaultLocation?: {
      lat: number;
      lon: number;
      name?: string;
      country?: string;
    };
  };
  favorites: string[];
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAuthToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
    type: String,
    default: null
  },
  preferences: {
    temperatureUnit: {
      type: String,
      enum: ['celsius', 'fahrenheit'],
      default: 'celsius'
    },
    windSpeedUnit: {
      type: String,
      enum: ['kmh', 'mph', 'ms'],
      default: 'kmh'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    notifications: {
      weatherAlerts: {
        type: Boolean,
        default: true
      },
      dailyForecast: {
        type: Boolean,
        default: false
      },
      extremeWeather: {
        type: Boolean,
        default: true
      }
    },
    defaultLocation: {
      lat: Number,
      lon: Number,
      name: String,
      country: String
    }
  },
  favorites: [{
    type: String,
    trim: true
  }],
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      return ret;
    }
  }
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate JWT token
userSchema.methods.generateAuthToken = function(): string {
  return jwt.sign(
    { 
      id: this._id, 
      email: this.email 
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { 
      expiresIn: process.env.JWT_EXPIRE || '7d' 
    }
  );
};

// Generate refresh token
userSchema.methods.generateRefreshToken = function(): string {
  return jwt.sign(
    { 
      id: this._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' 
    }
  );
};

export const User = mongoose.model<IUser>('User', userSchema);

// models/WeatherLog.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IWeatherLog extends Document {
  location: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  userId?: string;
  ipAddress?: string;
  requestType: 'current' | 'forecast' | 'historical' | 'alerts';
  responseTime: number;
  success: boolean;
  errorMessage?: string;
  userAgent?: string;
  timestamp: Date;
}

const weatherLogSchema = new Schema<IWeatherLog>({
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: Number,
    lon: Number
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  ipAddress: {
    type: String,
    trim: true
  },
  requestType: {
    type: String,
    enum: ['current', 'forecast', 'historical', 'alerts'],
    required: true
  },
  responseTime: {
    type: Number,
    required: true
  },
  success: {
    type: Boolean,
    required: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  collection: 'weather_logs'
});

// Indexes for analytics queries
weatherLogSchema.index({ location: 1, timestamp: -1 });
weatherLogSchema.index({ userId: 1, timestamp: -1 });
weatherLogSchema.index({ success: 1, timestamp: -1 });
weatherLogSchema.index({ requestType: 1, timestamp: -1 });

export const WeatherLog = mongoose.model<IWeatherLog>('WeatherLog', weatherLogSchema);

// models/Favorite.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  userId: string;
  location: string;
  coordinates?: {
    lat: number;
    lon: number;
  };
  nickname?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: {
      type: Number,
      required: false
    },
    lon: {
      type: Number,
      required: false
    }
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: [30, 'Nickname cannot exceed 30 characters']
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound index to prevent duplicate favorites
favoriteSchema.index({ userId: 1, location: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default location per user
favoriteSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export const Favorite = mongoose.model<IFavorite>('Favorite', favoriteSchema);

// utils/ApiError.ts
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// utils/logger.ts
import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

// Custom format for development
const devFormat = combine(
  colorize(),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  simple()
);

// Production format
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
  defaultMeta: { service: 'weather-dashboard' },
  transports: [
    // Console transport
    new winston.transports.Console({
      stderrLevels: ['error']
    }),
    
    // File transports for production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ] : [])
  ],
  
  // Don't exit on handled exceptions
  exitOnError: false
});

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV === 'production') {
  logger.exceptions.handle(
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  );
  
  logger.rejections.handle(
    new winston.transports.File({ filename: 'logs/rejections.log' })
  );
}

// utils/validators.ts
import { body } from 'express-validator';

export const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

export const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
    
  body('preferences.temperatureUnit')
    .optional()
    .isIn(['celsius', 'fahrenheit'])
    .withMessage('Temperature unit must be celsius or fahrenheit'),
    
  body('preferences.windSpeedUnit')
    .optional()
    .isIn(['kmh', 'mph', 'ms'])
    .withMessage('Wind speed unit must be kmh, mph, or ms'),
    
  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark', 'auto'])
    .withMessage('Theme must be light, dark, or auto')
];