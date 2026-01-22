# Edurank Security & Privacy Audit Report
**Date:** January 22, 2026  
**Status:** Initial Comprehensive Review

---

## Executive Summary

Edurank is an education-focused student platform built on React + Vite (frontend) and Supabase + Edge Functions (backend). The codebase demonstrates **strong foundational security practices** with several **critical improvements needed**. This report identifies security/privacy vulnerabilities, missing features, and architectural concerns.

### Risk Assessment
| Category | Status | Priority |
|----------|--------|----------|
| Authentication | ✅ Good | Medium |
| Data Privacy | ⚠️ Concerns | **Critical** |
| API Security | ✅ Strong | Low-Medium |
| Frontend Security | ⚠️ Warnings | Medium |
| Feature Completeness | ⚠️ Missing | Medium-High |

---

## 🔴 CRITICAL SECURITY & PRIVACY ISSUES

### 1. **CORS Configuration Allows All Origins**
**Severity:** 🔴 CRITICAL  
**Location:** All Supabase Edge Functions  
**Issue:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",  // ⚠️ SECURITY RISK
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
```

**Impact:**
- Any malicious website can make requests to your APIs
- Enables Cross-Site Request Forgery (CSRF) attacks
- Violates student safety principles
- Third-party sites can access student data

**Recommendation:**
```typescript
const ALLOWED_ORIGINS = [
  'https://yourapp.com',
  'https://www.yourapp.com',
  'http://localhost:5173', // Dev only
];

function getCORSHeaders(origin: string | null) {
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin || '')
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}
```

---

### 2. **JWT Verification Disabled in config.toml**
**Severity:** 🔴 CRITICAL  
**Location:** `/workspaces/edurank-glow/supabase/config.toml`  
**Issue:**
```toml
[functions.generate-notes]
verify_jwt = false  # ⚠️ Functions don't verify JWT tokens!

[functions.find-video]
verify_jwt = false

[functions.generate-quiz]
verify_jwt = false

[functions.adaptive-question]
verify_jwt = false

[functions.analyze-weakness]
verify_jwt = false

[functions.fix-weak-areas-quiz]
verify_jwt = false
```

**Impact:**
- Functions manually verify JWTs (error-prone)
- Increases attack surface
- Inconsistent authentication handling
- Risk of accidental authentication bypass

**Recommendation:**
```toml
[functions.generate-notes]
verify_jwt = true  # Enable automatic verification

[functions.find-video]
verify_jwt = true
# ... repeat for all functions
```

Then remove manual JWT validation code from functions and let Supabase handle it automatically.

---

### 3. **API Keys Exposed in Client Logs**
**Severity:** 🔴 CRITICAL  
**Location:** `supabase/functions/find-video/index.ts` (line 180+)  
**Issue:**
```typescript
const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?...&key=${apiKey}`;
// This URL with API key might be logged or exposed in errors
```

**Impact:**
- YouTube API key could be logged in error messages
- Sensitive credentials in request URLs
- Potential quota exhaustion/abuse
- Student privacy compromised via video recommendations

**Recommendation:**
```typescript
// Use POST requests for sensitive parameters
async function searchYouTube(
  query: string,
  apiKey: string
): Promise<YouTubeVideo[]> {
  // Use POST with body instead of query params
  const searchResponse = await fetch(
    'https://www.googleapis.com/youtube/v3/search',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        part: 'snippet',
        q: query,
        type: 'video',
        maxResults: 10,
        key: apiKey,  // Still should be in header or secured
      }),
    }
  );
  // ...
}
```

---

### 4. **User Data Persisted in localStorage Without Encryption**
**Severity:** 🔴 CRITICAL  
**Location:** `/workspaces/edurank-glow/src/integrations/supabase/client.ts`  
**Issue:**
```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,  // ⚠️ Session data stored in plain text
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**Impact:**
- Session tokens stored in plain localStorage
- XSS attacks can steal session tokens
- Browser history/cache may expose sensitive data
- Student privacy violations

**Recommendation:**
```typescript
// Use memory storage + sessionStorage (more secure)
// For persistent sessions, use encrypted storage

import { createClient } from '@supabase/supabase-js';

// Custom secure storage adapter
const secureStorage = {
  getItem: (key: string) => {
    // Return from sessionStorage instead
    return sessionStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    // Use sessionStorage (cleared on tab close)
    sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    sessionStorage.removeItem(key);
  },
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: secureStorage,  // Cleared on tab/browser close
      persistSession: false,   // Don't persist across sessions
      autoRefreshToken: true,
    },
  }
);
```

---

### 5. **Perplexity API Key Exposed in Environment Variables Without Masking**
**Severity:** 🔴 CRITICAL  
**Location:** `supabase/functions/generate-notes/index.ts` (line 76)  
**Issue:**
```typescript
async function fetchVideoContext(videoTitle: string, videoId: string): Promise<string> {
  const PERPLEXITY_API_KEY = Deno.env.get("perplexity_api_key");
  // No validation that key exists
  // Could be exposed in logs
}
```

**Impact:**
- API keys in environment without rotation policy
- No key expiration mechanism
- Risk of unauthorized API access
- Potential data leakage through external AI service

**Recommendation:**
```typescript
// Use Supabase Secrets management
const PERPLEXITY_API_KEY = Deno.env.get("perplexity_api_key");

if (!PERPLEXITY_API_KEY) {
  throw new Error('Perplexity API key not configured');
}

// Add request signing/tracing
const requestId = crypto.randomUUID();
console.log(`[${requestId}] Starting video context fetch`);
// Never log the actual API key
```

---

### 6. **No Rate Limiting on Backend Functions**
**Severity:** 🔴 CRITICAL  
**Location:** All Edge Functions  
**Issue:**
```typescript
// Functions have NO built-in rate limiting
// Only Lovable AI returns 429 errors
// No abuse prevention for resource-intensive operations
```

**Impact:**
- DoS vulnerability (generate unlimited notes/quizzes)
- Expensive API calls (YouTube, Perplexity, Lovable AI)
- Student account abuse
- Financial exposure (API costs)

**Recommendation:** Create a rate limiter utility:
```typescript
// supabase/functions/shared/rateLimit.ts
async function checkRateLimit(
  userId: string,
  operation: string,
  limitsPerHour: number
): Promise<{ allowed: boolean; remaining: number }> {
  const key = `rl:${userId}:${operation}:${new Date().getHours()}`;
  // Use Redis or Supabase to track counts
  // Implement per-user, per-operation limits
}
```

---

## 🟡 MEDIUM SEVERITY ISSUES

### 7. **Inadequate Input Sanitization**
**Severity:** 🟡 MEDIUM  
**Location:** All `sanitizeInput` functions  
**Issue:**
```typescript
sanitized = sanitized
  .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
  .replace(/[<>]/g, '')
  .trim();
```

**Problems:**
- Only removes `<>` for HTML, not full XSS protection
- No context-aware escaping
- Doesn't handle HTML entities
- Missing SQL injection protection (though parameterized queries help)

**Recommendation:**
```typescript
import { encode } from 'https://esm.sh/html-entities@2.3.3';

function sanitizeHTML(input: string): string {
  // HTML-encode user input
  return encode(input);
}

function sanitizeJSON(input: string): string {
  // Ensure valid JSON
  return JSON.stringify(JSON.parse(input));
}
```

---

### 8. **Broadcast Password Reset Link via Email Without Encryption**
**Severity:** 🟡 MEDIUM  
**Location:** Supabase Auth (implicit)  
**Issue:**
- Password reset tokens sent via email
- Token could be intercepted if email account compromised
- No additional verification (e.g., SMS, security questions)

**Recommendation:**
- Implement 2FA for password resets
- Use time-limited tokens (already done by Supabase)
- Add IP-based verification warnings

---

### 9. **No Audit Logging for Sensitive Operations**
**Severity:** 🟡 MEDIUM  
**Location:** Backend functions  
**Issue:**
```typescript
// No audit log for:
// - Quiz submissions
// - Note generation (expensive operation)
// - Video recommendations
// - User profile changes
// - Credit consumption
```

**Impact:**
- Can't detect fraud or abuse
- No way to investigate security incidents
- GDPR/student privacy law violations
- Missing accountability for feature misuse

**Recommendation:**
```typescript
// Create audit_logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata jsonb,
  ip_address inet,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

// Log all sensitive operations
async function logAudit(
  userId: string,
  action: string,
  resource: string,
  metadata?: any
) {
  // Insert into audit_logs table
}
```

---

### 10. **No Content Security Policy (CSP)**
**Severity:** 🟡 MEDIUM  
**Location:** `index.html`  
**Issue:**
- No CSP headers defined
- Vulnerable to inline script injection
- No protection against unintended external resource loading

**Recommendation:**
Add to your server configuration (or Netlify/Vercel headers):
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'wasm-unsafe-eval'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' https:; 
  font-src 'self'; 
  connect-src 'self' https://api.youtube.com https://api.perplexity.ai;
```

---

### 11. **Session Token Exposure in URL/Logs**
**Severity:** 🟡 MEDIUM  
**Location:** Various frontend components  
**Issue:**
```typescript
// Authorization header sent in requests (good)
// But tokens might be logged in console or Redux DevTools
const { data, error } = await supabase.functions.invoke('generate-notes', {
  body: { /* ... */ },
});
```

**Recommendation:**
- Ensure Redux DevTools is disabled in production
- Sanitize console logs in production
- Use Content Security Policy to block DevTools

---

## 🟠 FEATURE COMPLETENESS GAPS

### 12. **Missing: Comprehensive Security Features**

#### A. No 2FA/MFA Implementation
**Requirement:** Age-appropriate multi-factor authentication  
**Current:** Only email/password  
**Missing:**
- TOTP (Google Authenticator, Authy)
- SMS verification
- Backup codes
- Security keys support

#### B. No Data Deletion/Privacy Consent
**Requirement:** Student privacy-first design  
**Missing:**
- GDPR "Right to be Forgotten" implementation
- Data export functionality
- Cookie consent banner
- Privacy policy enforcement
- Parental consent workflows (COPPA compliance)

#### C. No Session Management
**Missing:**
- Active session tracking
- "Login from new device" warnings
- Session revocation
- Device trust management
- Suspicious activity alerts

---

### 13. **Missing: Content Moderation & Safety**

**Current Issues:**
- No filtering for inappropriate video recommendations
- No content flagging system
- No automated abuse detection
- No manual review queue for generated content

**Recommendation:**
```typescript
// Content moderation pipeline
async function validateGeneratedContent(content: string): Promise<{
  safe: boolean;
  issues: string[];
}> {
  // Use Google's Perspective API or similar
  // Check for:
  // - Harmful language
  // - Age-appropriate content
  // - Factual accuracy
  // - Plagiarism
}
```

---

### 14. **Missing: Usage Monitoring & Limits**

**Current:** Credit system exists but no comprehensive monitoring  
**Missing:**
- Daily/weekly usage patterns
- Anomaly detection (unusual activity)
- Rate limiting per function
- Cost tracking and budget alerts
- Student safety guardrails (e.g., max study hours)

---

### 15. **Missing: Logging & Analytics (Privacy-Respecting)**

**Current:** Basic logging only  
**Missing:**
- Aggregate statistics (no PII)
- Performance monitoring
- Error tracking (Sentry)
- Feature usage analytics
- Student learning outcome metrics

---

## 🟢 SECURITY STRENGTHS

### ✅ Positive Findings

1. **Row-Level Security (RLS) Enabled** - Database has comprehensive RLS policies
2. **JWT Authentication** - Proper token-based auth implementation
3. **Environment Variables** - Secrets not hardcoded
4. **Input Validation** - Prompt injection patterns detected and blocked
5. **HTTPS Enforcement** - API calls use HTTPS
6. **SQL Injection Protection** - Using parameterized queries via Supabase ORM
7. **TypeScript** - Type safety reduces runtime vulnerabilities
8. **No SQL Concatenation** - Proper use of prepared statements

---

## 🔧 IMPLEMENTATION PRIORITIES

### Phase 1: Critical (Do Immediately)
1. **Fix CORS to whitelist only allowed origins** ⏱️ 2-4 hours
2. **Enable JWT verification in config.toml** ⏱️ 1-2 hours
3. **Implement rate limiting on all backend functions** ⏱️ 4-8 hours
4. **Switch localStorage to sessionStorage** ⏱️ 2-3 hours
5. **Mask API keys in logs** ⏱️ 2-3 hours

### Phase 2: High Priority (Next Sprint)
6. **Implement audit logging system** ⏱️ 8-12 hours
7. **Add CSP headers** ⏱️ 1-2 hours
8. **Implement 2FA support** ⏱️ 8-16 hours
9. **Add privacy/consent management** ⏱️ 6-10 hours
10. **Session management features** ⏱️ 6-8 hours

### Phase 3: Medium Priority (Following Sprint)
11. **Content moderation pipeline** ⏱️ 12-20 hours
12. **Comprehensive monitoring/alerts** ⏱️ 8-12 hours
13. **Usage analytics (privacy-respecting)** ⏱️ 6-10 hours
14. **Penetration testing** ⏱️ 16-24 hours

---

## 📋 FEATURE COMPLETENESS CHECKLIST

| Feature | Status | Notes |
|---------|--------|-------|
| Notes Generation | ✅ 90% | Implemented, needs content validation |
| Quiz Generation | ✅ 90% | Implemented, missing adaptive difficulty tuning |
| Video Discovery | ✅ 85% | Implemented, missing safety filters |
| Notes Reading Assistant | ⚠️ 40% | Basic UI, missing explanations/translations |
| Adaptive Quizzes | ✅ 60% | Partial implementation |
| 2FA/MFA | ❌ 0% | Not implemented |
| Privacy Controls | ❌ 0% | Not implemented |
| Session Management | ⚠️ 20% | Minimal implementation |
| Audit Logging | ❌ 0% | Not implemented |
| Rate Limiting | ⚠️ 30% | Only external API rate limits |
| Content Moderation | ❌ 0% | Not implemented |
| Usage Monitoring | ⚠️ 50% | Credit system exists, limited insights |

---

## 🎯 NEXT STEPS

1. **Review this report** with your team
2. **Prioritize fixes** based on business risk
3. **Create tickets** for each issue
4. **Implement Phase 1** immediately
5. **Schedule security review** after Phase 1
6. **Conduct penetration testing** before production launch

---

## 📞 Questions for the Team

1. What's your target audience age? (Impacts COPPA compliance requirements)
2. What's your hosting provider? (Affects CSP/header configuration)
3. Do you plan to handle sensitive data (medical, behavioral)? (Impacts encryption needs)
4. What's your SLA for incident response?
5. Are there existing integrations with school systems? (FERPA implications)

---

**Report Prepared By:** GitHub Copilot  
**Review Status:** Ready for Team Discussion  
**Next Review Date:** After Phase 1 Implementation
