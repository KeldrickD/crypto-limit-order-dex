/**
 * Monitoring utilities for the application
 * This file contains functions for tracking application performance and errors
 */

// Define error types for better categorization
export enum ErrorType {
  API = 'api_error',
  CONTRACT = 'contract_error',
  UI = 'ui_error',
  NETWORK = 'network_error',
  UNKNOWN = 'unknown_error'
}

// Interface for error reporting
interface ErrorReport {
  type: ErrorType;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

// Store errors locally if remote logging fails
const localErrorStore: ErrorReport[] = [];

/**
 * Log an error to the monitoring system
 * @param type Error type for categorization
 * @param error The error object or message
 * @param metadata Additional context about the error
 */
export function logError(type: ErrorType, error: Error | string, metadata?: Record<string, any>): void {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const errorStack = typeof error === 'string' ? undefined : error.stack;
  
  const errorReport: ErrorReport = {
    type,
    message: errorMessage,
    stack: errorStack,
    metadata,
    timestamp: Date.now()
  };

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${type}]`, errorMessage, metadata);
  }

  // Send to monitoring service if configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Here you would integrate with your monitoring service
    // Example: Sentry.captureException(error, { extra: metadata });
    sendToMonitoringService(errorReport).catch(e => {
      // Store locally if remote logging fails
      localErrorStore.push(errorReport);
      console.error('Failed to send error to monitoring service:', e);
    });
  } else {
    // Store locally if no monitoring service is configured
    localErrorStore.push(errorReport);
  }
}

/**
 * Track a user action or event
 * @param eventName Name of the event
 * @param properties Additional properties about the event
 */
export function trackEvent(eventName: string, properties?: Record<string, any>): void {
  // Skip tracking if analytics are disabled
  if (process.env.NEXT_PUBLIC_ENABLE_ANALYTICS !== 'true') {
    return;
  }

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[Event] ${eventName}`, properties);
  }

  // Send to analytics service
  // Example: analytics.track(eventName, properties);
}

/**
 * Track page view
 * @param pageName Name of the page
 * @param url URL of the page
 */
export function trackPageView(pageName: string, url: string): void {
  trackEvent('page_view', { pageName, url });
}

/**
 * Send error report to monitoring service
 * This is a placeholder for actual implementation
 */
async function sendToMonitoringService(errorReport: ErrorReport): Promise<void> {
  // Placeholder for actual implementation
  // Example: await fetch('/api/log-error', { method: 'POST', body: JSON.stringify(errorReport) });
  return Promise.resolve();
}

/**
 * Initialize monitoring
 * Call this function at application startup
 */
export function initMonitoring(): void {
  // Set up global error handler
  if (typeof window !== 'undefined') {
    window.onerror = (message, source, lineno, colno, error) => {
      logError(
        ErrorType.UNKNOWN,
        error || String(message),
        { source, lineno, colno }
      );
      return false; // Let default error handling continue
    };

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      logError(
        ErrorType.UNKNOWN,
        event.reason || 'Unhandled Promise Rejection',
        { reason: event.reason }
      );
    });
  }

  // Log application startup
  trackEvent('app_initialized', {
    version: process.env.NEXT_PUBLIC_APP_VERSION,
    environment: process.env.NEXT_PUBLIC_BUILD_ENV
  });
} 