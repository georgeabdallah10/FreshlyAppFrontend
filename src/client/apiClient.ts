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
import { Platform } from 'react-native';
import { BASE_URL } from '../env/baseUrl';
import { supabase } from '../supabase/client';

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
    if (Platform.OS === 'web') {
      const sessionToken = sessionStorage.getItem('access_token');
      if (sessionToken) return sessionToken;
      const localToken = localStorage.getItem('access_token');
      return localToken;
    } else {
      return await AsyncStorage.getItem('access_token');
    }
  } catch (error) {
    console.error('[API Client] Error retrieving auth token:', error);
    return null;
  }
}

async function setAuthToken(token: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      sessionStorage.setItem('access_token', token);
    } else {
      await AsyncStorage.setItem('access_token', token);
    }
  } catch (error) {
    console.error('[API Client] Error setting auth token:', error);
  }
}

async function clearAuthToken(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem('access_token');
      localStorage.removeItem('access_token');
    } else {
      await AsyncStorage.removeItem('access_token');
    }
  } catch (error) {
    console.error('[API Client] Error clearing auth token:', error);
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

        // Log requests in development
        if (__DEV__) {
          console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
          if (config.data) {
            console.log('[API Request Body]', config.data);
          }
        }

        return config;
      },
      (error) => {
        console.error('[API Request Error]', error);
        return Promise.reject(error);
      }
    );

    // ========== RESPONSE INTERCEPTOR ==========
    this.client.interceptors.response.use(
      (response) => {
        // Log successful responses in development
        if (__DEV__) {
          console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
        }
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log errors in development
        if (__DEV__) {
          console.error('[API Response Error]', {
            url: originalRequest?.url,
            status: error.response?.status,
            message: error.message,
          });
        }

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
            // Attempt to refresh the Supabase session
            const { data, error: refreshError } = await supabase.auth.refreshSession();

            if (refreshError || !data.session) {
              throw new Error('Session refresh failed');
            }

            const newToken = data.session.access_token;
            await setAuthToken(newToken);

            // Process queued requests
            this.failedQueue.forEach((prom) => prom.resolve(newToken));
            this.failedQueue = [];

            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Token refresh failed, logout user
            this.failedQueue.forEach((prom) => prom.reject(refreshError));
            this.failedQueue = [];
            await clearAuthToken();
            await supabase.auth.signOut();
            
            return Promise.reject(new Error('Authentication expired. Please log in again.'));
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
      return {
        message: (error.response.data as any)?.message || error.message || 'An error occurred',
        status: error.response.status,
        code: (error.response.data as any)?.code,
        data: error.response.data,
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
export default apiClient;
