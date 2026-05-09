# API Key & Error Handling Guide

## Overview
This application uses the Google Gemini API for AI-powered government scheme recommendations. Proper API key configuration is critical for the app to function.

## Environment Setup

### Getting Your API Key

1. **Visit Google AI Studio**: https://ai.google.dev/
2. **Create/Select Project**: Ensure you're in the right GCP project
3. **Generate API Key**:
   - Click "Get API Key" 
   - Choose "Create API Key in existing project"
   - Copy the generated key (starts with "AIza")
4. **Enable Required APIs** in GCP Console:
   - Generative Language API
   - Make sure your API key has access to `gemini-2.5-flash` model

### Setting API Key Locally

Add to `HiddenApi.env` (in root directory):
```
GEMINI_API_KEY="AIzaSy..."
```

**Note**: `HiddenApi.env` is in `.gitignore` and won't be committed.

### Setting API Key in AI Studio

1. Go to **Secrets** panel in AI Studio
2. Add `GEMINI_API_KEY` with your key value
3. Save and redeploy

## Error Messages & Solutions

### ❌ "API Key Invalid: The API key is not valid or has expired"

**Causes**:
- API key doesn't exist in environment
- API key format is wrong (should start with "AIza")
- API key is incomplete or corrupted
- API key expired or was revoked

**Solutions**:
1. Verify key is set in environment variables
2. Confirm key starts with "AIza" and is 39+ characters
3. Test key in [Google AI Studio](https://ai.google.dev/)
4. If key is old, regenerate in GCP Console
5. Check GCP project hasn't been deleted

### ⏱️ "Rate Limit Exceeded: The AI service is currently under high demand"

**Cause**: Too many API requests in a short time

**Solutions**:
1. **Immediate**: Wait 1-2 minutes before retrying
2. **Short-term**: Add request debouncing in code
3. **Long-term**: Upgrade to a paid plan in GCP Console for higher limits
4. **Development**: Consider using a dedicated API key for testing

### 🔒 "Permission Denied: Your API key doesn't have permission"

**Cause**: API key lacks required permissions

**Solutions**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to your project
3. Check APIs & Services → Enabled APIs
4. Ensure "Generative Language API" is enabled
5. Regenerate the API key

### 🌐 "Connection Issue: Please check your internet connection"

**Cause**: Network connectivity problem

**Solutions**:
1. Check internet connection
2. Verify you can access https://generativelanguage.googleapis.com
3. Check for corporate firewall restrictions
4. Try from different network if corporate network blocks it

### 🤖 "Model Error: The AI model is temporarily unavailable"

**Cause**: Gemini API service unavailable

**Solutions**:
1. Check [Google Cloud Status Dashboard](https://status.cloud.google.com/)
2. Wait a few minutes and retry
3. Contact Google Cloud Support if issue persists

## Technical Details

### API Key Validation

The application validates API keys on startup and before each API call:

```typescript
// Validates:
- Key exists in environment
- Key format (starts with "AIza")
- Minimum key length (30+ characters)
```

### Error Handling Strategy

1. **Pre-request Validation**: Check key format before API call
2. **Error Parsing**: Map Google API errors to user-friendly messages
3. **Error Logging**: Detailed technical logs for debugging
4. **User Feedback**: Clear, actionable error messages in UI

### Debug Information

When errors occur, the browser console logs:
- Error status code
- Error message
- User ID and authentication info
- API key existence and validity status
- Full error object (JSON)

**To view**: Open Browser DevTools → Console tab

## Best Practices

### ✅ Do's
- Keep API key secure (never commit to version control)
- Use environment variables for key storage
- Validate keys on app startup
- Log errors for debugging
- Implement rate limit backoff strategies
- Use different keys for dev/prod

### ❌ Don'ts
- Hardcode API keys in source code
- Commit `.env` or key files to git
- Share API keys in messages/emails
- Use production keys for testing
- Ignore validation warnings
- Store keys in localStorage/cookies (client-side)

## Debugging Checklist

If you're experiencing API errors:

- [ ] API key is set in environment variables
- [ ] API key starts with "AIza"
- [ ] API key is 39+ characters long
- [ ] Generative Language API is enabled in GCP
- [ ] Internet connection is working
- [ ] API key hasn't been revoked in GCP Console
- [ ] Browser console shows detailed error logs
- [ ] Check [Google Cloud Status](https://status.cloud.google.com/)

## File Locations

- **Validation Logic**: `src/lib/apiKeyValidator.ts`
- **API Integration**: `src/App.tsx` (generateResponse function)
- **Config Example**: `.env.example`
- **Local Secrets** (ignored): `HiddenApi.env`

## Support

For issues:
1. Check this guide first
2. Review browser console logs
3. Verify environment setup
4. Contact support with error details from console
