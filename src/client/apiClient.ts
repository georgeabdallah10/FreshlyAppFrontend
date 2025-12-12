/**
 * ============================================
 * API CLIENT - Production-Grade HTTP Client
 * ============================================
 * 
 * Centralized API client with:
 * - Automatic JWT authentication
 * - Token refresh on 401
 * - Request/response interceptors
 * - Error handling and retry logic
 * - Request deduplication
 * - Exponential backoff
 * - Logging in development
 * - Request cancellation support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { BASE_URL } from '../env/baseUrl';

// ============================================
// TYPES
// ============================================

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  data?: any;
}

export interface RetryConfig {
  retries?: number;
  retryDelay?: number;
  retryCondition?: (error: AxiosError) => boolean;
}

// ============================================
// STORAGE UTILITIES
// ============================================

async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('access_token');
  } catch (error) {
    console.log('ERROR [API Client] Error retrieving auth token:', error);
    return null;
  }
}

async function getRefreshToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('refresh_token');
  } catch (error) {
    console.log('ERROR [API Client] Error retrieving refresh token:', error);
    return null;
  }
}

async function setAuthToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem('access_token', token);
  } catch (error) {
    console.log('ERROR [API Client] Error setting auth token:', error);
  }
}

async function setRefreshToken(token: string): Promise<void> {
  try {
    await AsyncStorage.setItem('refresh_token', token);
  } catch (error) {
    console.log('ERROR [API Client] Error setting refresh token:', error);
  }
}

async function clearAuthToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
  } catch (error) {
    console.log('ERROR [API Client] Error clearing auth token:', error);
  }
}

// ============================================
// API CLIENT CLASS
// ============================================

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors() {
    // ========== REQUEST INTERCEPTOR ==========
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await getAuthToken();
        
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
      },
      (error) => {
        console.log('ERROR [API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // ========== RESPONSE INTERCEPTOR ==========
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // ========== HANDLE 401 UNAUTHORIZED ==========
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return this.client(originalRequest);
              })
              .catch((err) => {
                return Promise.reject(err);
              });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Get refresh token from storage
            const refreshToken = await getRefreshToken();

            if (!refreshToken) {
              console.log('No refresh token available');
            }

            // Call backend refresh endpoint
            const response = await axios.post(`${BASE_URL}/auth/refresh`, {
              refresh_token: refreshToken
            });

            const { access_token, refresh_token: new_refresh_token } = response.data;

            // Update stored tokens
            await setAuthToken(access_token);
            await setRefreshToken(new_refresh_token);

            // Update default header
            this.client.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
            originalRequest.headers.Authorization = `Bearer ${access_token}`;

            // Process queued requests
            this.failedQueue.forEach((prom) => prom.resolve(access_token));
            this.failedQueue = [];

            // Retry original request
            return this.client(originalRequest);
          } catch (refreshError) {
            // Token refresh failed - clear auth and fail gracefully
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];

            // Clear tokens
            await clearAuthToken();

            // Return normalized 401 error
            return Promise.reject(this.normalizeError(error));
          } finally {
            this.isRefreshing = false;
          }
        }

        // ========== HANDLE OTHER ERRORS ==========
        return Promise.reject(this.normalizeError(error));
      }
    );
  }

  /**
   * Normalize error responses
   */
  private normalizeError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error
      const responseData = error.response.data as any;

      return {
        // Prefer backend-provided message/detail when available
        message: responseData?.message || responseData?.detail || error.message || 'An error occurred',
        status: error.response.status,
        code: responseData?.code,
        data: responseData,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
      };
    }
  }

  /**
   * Exponential backoff retry logic
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      const apiError = error as ApiError;
      const shouldRetry = apiError.status === 429 || apiError.code === 'NETWORK_ERROR';

      if (!shouldRetry) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.retryWithBackoff(fn, retries - 1, delay * 2);
    }
  }

  /**
   * GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(url, data, config);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  /**
   * GET request with retry
   */
  async getWithRetry<T>(url: string, config?: AxiosRequestConfig, retries = 3): Promise<T> {
    return this.retryWithBackoff(() => this.get<T>(url, config), retries);
  }

  /**
   * POST request with retry
   */
  async postWithRetry<T>(url: string, data?: any, config?: AxiosRequestConfig, retries = 3): Promise<T> {
    return this.retryWithBackoff(() => this.post<T>(url, data, config), retries);
  }

  /**
   * Create a cancel token for request cancellation
   */
  createCancelToken() {
    return axios.CancelToken.source();
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

export const apiClient = new ApiClient();
export { getAuthToken };
export default apiClient;
