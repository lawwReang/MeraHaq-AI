/**
 * API Key Validation and Error Handling Utilities
 */

export interface ApiKeyValidationResult {
  isValid: boolean;
  key: string | null;
  error?: string;
}

export interface ApiErrorResponse {
  error?: {
    code: number;
    message: string;
    status?: string;
    details?: Array<{
      "@type": string;
      reason?: string;
      domain?: string;
      metadata?: Record<string, string>;
    }>;
  };
}

/**
 * Validates if API key exists and has proper format
 */
export function validateApiKey(apiKey: string | undefined): ApiKeyValidationResult {
  if (!apiKey) {
    return {
      isValid: false,
      key: null,
      error: "API key is not configured. Please add GEMINI_API_KEY to your environment variables.",
    };
  }

  const trimmedKey = apiKey.trim();
  
  if (!trimmedKey) {
    return {
      isValid: false,
      key: null,
      error: "API key is empty. Please ensure GEMINI_API_KEY environment variable is set correctly.",
    };
  }

  // Validate key format (Google API keys typically start with AIza)
  if (!trimmedKey.startsWith("AIza")) {
    return {
      isValid: false,
      key: null,
      error: "API key format is invalid. Google API keys should start with 'AIza'. Please check your GEMINI_API_KEY configuration.",
    };
  }

  // Check minimum length (Google API keys are typically 39 characters)
  if (trimmedKey.length < 30) {
    return {
      isValid: false,
      key: null,
      error: "API key appears to be incomplete. Please verify your GEMINI_API_KEY is correct.",
    };
  }

  return {
    isValid: true,
    key: trimmedKey,
  };
}

/**
 * Parses Gemini API error responses and returns user-friendly messages
 */
export function parseGeminiError(error: any): {
  userMessage: string;
  technicalMessage: string;
  errorCode?: string;
} {
  // Check for API Key errors
  if (
    error?.status === "INVALID_ARGUMENT" ||
    error?.message?.includes("API Key not found") ||
    error?.message?.includes("API_KEY_INVALID") ||
    error?.error?.status === "INVALID_ARGUMENT"
  ) {
    return {
      userMessage: "❌ API Key Invalid: The API key is not valid or has expired. Please verify your GEMINI_API_KEY in the environment configuration.",
      technicalMessage: error?.message || "Invalid API Key provided",
      errorCode: "API_KEY_INVALID",
    };
  }

  // Check for Rate Limiting
  if (
    error?.status === 429 ||
    error?.message?.includes("RESOURCE_EXHAUSTED") ||
    error?.message?.includes("Quota exceeded") ||
    error?.error?.status === "RESOURCE_EXHAUSTED"
  ) {
    return {
      userMessage: "⏱️ Rate Limit Exceeded: The AI service is currently under high demand. Please wait 1-2 minutes and try again.",
      technicalMessage: error?.message || "Rate limit exceeded",
      errorCode: "RATE_LIMIT_EXCEEDED",
    };
  }

  // Check for Permission/Authentication errors
  if (
    error?.status === 401 ||
    error?.status === 403 ||
    error?.message?.includes("Permission denied") ||
    error?.error?.status === "PERMISSION_DENIED"
  ) {
    return {
      userMessage: "🔒 Permission Denied: Your API key doesn't have permission to access this service. Please verify your API credentials.",
      technicalMessage: error?.message || "Authentication failed",
      errorCode: "PERMISSION_DENIED",
    };
  }

  // Check for Network/Connection errors
  if (
    error?.message?.includes("offline") ||
    error?.message?.includes("UNAVAILABLE") ||
    error?.message?.includes("Cannot reach") ||
    !navigator.onLine
  ) {
    return {
      userMessage: "🌐 Connection Issue: Please check your internet connection and try again.",
      technicalMessage: error?.message || "Network connection failed",
      errorCode: "NETWORK_ERROR",
    };
  }

  // Check for Model errors
  if (
    error?.message?.includes("model") ||
    error?.message?.includes("MODEL_NOT_FOUND") ||
    error?.error?.status === "NOT_FOUND"
  ) {
    return {
      userMessage: "🤖 Model Error: The AI model is temporarily unavailable. Please try again in a moment.",
      technicalMessage: error?.message || "Model not found or unavailable",
      errorCode: "MODEL_ERROR",
    };
  }

  // Generic error
  return {
    userMessage: `⚠️ An unexpected error occurred: ${error?.message || "Please try again"}`,
    technicalMessage: error?.message || "Unknown error",
    errorCode: "UNKNOWN_ERROR",
  };
}

/**
 * Creates a detailed error log for debugging
 */
export function createErrorLog(
  error: any,
  context: {
    operation: string;
    userId?: string;
    timestamp?: Date;
    apiKeyExists?: boolean;
    apiKeyValid?: boolean;
  }
): string {
  const timestamp = context.timestamp || new Date();
  const log = {
    timestamp: timestamp.toISOString(),
    operation: context.operation,
    userId: context.userId || "anonymous",
    apiKeyExists: context.apiKeyExists ?? false,
    apiKeyValid: context.apiKeyValid ?? false,
    errorStatus: error?.status,
    errorMessage: error?.message,
    errorCode: error?.error?.status,
    fullError: JSON.stringify(error, null, 2),
  };

  return JSON.stringify(log, null, 2);
}
