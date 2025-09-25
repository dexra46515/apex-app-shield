import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const requestBody = await req.json();
    const { action } = requestBody;

    switch (action) {
      case 'generate_config':
        // Handle the structure sent from the frontend
        const config = {
          framework: requestBody.framework || 'express',
          config_name: requestBody.config_name || 'default-waf',
          security_level: requestBody.security_level || 'standard',
          customer_id: requestBody.customer_id || 'demo-customer'
        };
        return await generateDevWAFConfig(supabase, config);
      case 'get_frameworks':
        return await getSupportedFrameworks();
      case 'generate_middleware':
        const middlewareConfig = {
          framework: requestBody.framework || 'express',
          security_level: requestBody.security_level || 'standard'
        };
        return await generateMiddlewareCode(middlewareConfig);
      case 'create_docker_config':
        const dockerConfig = {
          framework: requestBody.framework || 'express',
          config_name: requestBody.config_name || 'default-waf'
        };
        return await createDockerConfiguration(dockerConfig);
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Dev WAF Generator Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function generateDevWAFConfig(supabase: any, config: any) {
  console.log('=== GENERATING REAL DEV WAF CONFIG ===');
  console.log('Framework:', config.framework);
  console.log('Security Level:', config.security_level);

  try {
    // Generate framework-specific middleware code
    const middlewareCode = generateFrameworkMiddleware(config.framework, config.security_level);
    
    // Generate configuration template
    const configTemplate = generateConfigTemplate(config.framework, config.security_level);
    
    // Generate package.json additions
    const packageConfig = generatePackageConfig(config.framework);
    
    // Generate Docker configuration
    const dockerConfig = generateDockerConfig(config.framework);
    
    // Generate environment variables
    const environmentVars = generateEnvironmentVars(config);

    // Store in database
    const { data, error } = await supabase
      .from('dev_waf_configs')
      .insert({
        customer_id: config.customer_id,
        config_name: `${config.framework}-dev-waf-${Date.now()}`,
        framework: config.framework,
        config_template: configTemplate,
        middleware_code: middlewareCode,
        docker_config: dockerConfig,
        npm_package_config: packageConfig,
        environment_vars: environmentVars
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Development WAF configuration generated',
        config_id: data.id,
        framework: config.framework,
        files_generated: {
          middleware: `waf-middleware.${getFileExtension(config.framework)}`,
          config: 'waf.config.json',
          docker: 'Dockerfile.waf',
          package: 'package-additions.json',
          env: '.env.waf'
        },
        middleware_code: middlewareCode,
        config_template: configTemplate,
        docker_config: dockerConfig,
        package_config: packageConfig,
        environment_vars: environmentVars,
        installation_commands: getInstallationCommands(config.framework),
        integration_guide: getIntegrationGuide(config.framework)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Config generation failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
}

function generateFrameworkMiddleware(framework: string, securityLevel: string): string {
  const baseSecurityRules = {
    basic: ['xss-protection', 'sql-injection', 'rate-limiting'],
    standard: ['xss-protection', 'sql-injection', 'rate-limiting', 'csrf-protection', 'input-validation'],
    strict: ['xss-protection', 'sql-injection', 'rate-limiting', 'csrf-protection', 'input-validation', 'content-security-policy', 'ddos-protection']
  };

  const rules = baseSecurityRules[securityLevel as keyof typeof baseSecurityRules] || baseSecurityRules.basic;

  switch (framework) {
    case 'express':
      return generateExpressMiddleware(rules);
    case 'fastify':
      return generateFastifyMiddleware(rules);
    case 'next':
      return generateNextMiddleware(rules);
    case 'django':
      return generateDjangoMiddleware(rules);
    case 'laravel':
      return generateLaravelMiddleware(rules);
    default:
      return generateGenericMiddleware(rules);
  }
}

function generateExpressMiddleware(rules: string[]): string {
  return `
/* WAF Middleware for Express.js - AUTO-GENERATED */
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

class WAFMiddleware {
  constructor(config = {}) {
    this.config = {
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        ...config.rateLimit
      },
      security: {
        xssFilter: true,
        sqlInjection: true,
        ...config.security
      }
    };
  }

  // Rate Limiting Middleware
  rateLimiter() {
    return rateLimit({
      windowMs: this.config.rateLimit.windowMs,
      max: this.config.rateLimit.max,
      message: {
        error: 'Too many requests from this IP',
        retryAfter: Math.ceil(this.config.rateLimit.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  }

  // Security Headers Middleware
  securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      xssFilter: this.config.security.xssFilter,
    });
  }

  // SQL Injection Protection
  sqlInjectionProtection() {
    return (req, res, next) => {
      const sqlPatterns = [
        /('|(\\\\')|(;)|(\\\\;)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute)|(script)/i
      ];
      
      const checkSQLInjection = (str) => {
        return sqlPatterns.some(pattern => pattern.test(str));
      };

      // Check query parameters
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === 'string' && checkSQLInjection(value)) {
          return res.status(403).json({
            error: 'Potential SQL injection detected',
            blocked_parameter: key,
            waf_action: 'blocked'
          });
        }
      }

      // Check request body
      if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        if (checkSQLInjection(bodyStr)) {
          return res.status(403).json({
            error: 'Potential SQL injection detected in request body',
            waf_action: 'blocked'
          });
        }
      }

      next();
    };
  }

  // XSS Protection Middleware
  xssProtection() {
    return (req, res, next) => {
      const xssPatterns = [
        /<script[^>]*>.*?<\\/script>/gi,
        /<iframe[^>]*>.*?<\\/iframe>/gi,
        /javascript:/gi,
        /on\\w+\\s*=/gi
      ];

      const checkXSS = (str) => {
        return xssPatterns.some(pattern => pattern.test(str));
      };

      // Check all input sources
      const checkObject = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          if (typeof value === 'string' && checkXSS(value)) {
            return res.status(403).json({
              error: 'Potential XSS attack detected',
              blocked_field: \`\${path}\${key}\`,
              waf_action: 'blocked'
            });
          } else if (typeof value === 'object' && value !== null) {
            const result = checkObject(value, \`\${path}\${key}.\`);
            if (result) return result;
          }
        }
      };

      if (req.query && Object.keys(req.query).length > 0) {
        const result = checkObject(req.query, 'query.');
        if (result) return result;
      }

      if (req.body && Object.keys(req.body).length > 0) {
        const result = checkObject(req.body, 'body.');
        if (result) return result;
      }

      next();
    };
  }

  // Input Validation Middleware Factory
  validateInput(schema) {
    return [
      ...schema,
      (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Input validation failed',
            details: errors.array(),
            waf_action: 'validation_failed'
          });
        }
        next();
      }
    ];
  }

  // Complete WAF Stack
  protect() {
    const middlewares = [
      this.securityHeaders(),
      this.rateLimiter(),
    ];

    ${rules.includes('sql-injection') ? 'middlewares.push(this.sqlInjectionProtection());' : ''}
    ${rules.includes('xss-protection') ? 'middlewares.push(this.xssProtection());' : ''}

    return middlewares;
  }

  // Logging Middleware
  auditLogger() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Log request
      console.log(\`[WAF] \${new Date().toISOString()} - \${req.method} \${req.path} from \${req.ip}\`);
      
      // Override res.status to log responses
      const originalStatus = res.status;
      res.status = function(code) {
        if (code >= 400) {
          console.log(\`[WAF] Blocked request - Status: \${code}, IP: \${req.ip}, Path: \${req.path}\`);
        }
        return originalStatus.call(this, code);
      };

      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(\`[WAF] Request completed - Status: \${res.statusCode}, Duration: \${duration}ms\`);
      });

      next();
    };
  }
}

// Usage Example:
// const waf = new WAFMiddleware({
//   rateLimit: { max: 50 },
//   security: { xssFilter: true }
// });
// 
// app.use(waf.auditLogger());
// app.use(waf.protect());

module.exports = WAFMiddleware;
`;
}

function generateFastifyMiddleware(rules: string[]): string {
  return `
/* WAF Plugin for Fastify - AUTO-GENERATED */
const fp = require('fastify-plugin');

async function wafPlugin(fastify, options) {
  const config = {
    rateLimit: {
      max: 100,
      timeWindow: '1 minute',
      ...options.rateLimit
    },
    security: {
      xssFilter: true,
      sqlInjection: true,
      ...options.security
    }
  };

  // Register rate limiting
  await fastify.register(require('@fastify/rate-limit'), config.rateLimit);

  // Register security headers
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  });

  // SQL Injection Protection Hook
  ${rules.includes('sql-injection') ? `
  fastify.addHook('preHandler', async (request, reply) => {
    const sqlPatterns = [
      /('|(\\\\')|(;)|(\\\\;)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute)|(script)/i
    ];
    
    const checkSQLInjection = (str) => {
      return sqlPatterns.some(pattern => pattern.test(str));
    };

    // Check query parameters
    for (const [key, value] of Object.entries(request.query || {})) {
      if (typeof value === 'string' && checkSQLInjection(value)) {
        reply.status(403).send({
          error: 'Potential SQL injection detected',
          blocked_parameter: key,
          waf_action: 'blocked'
        });
        return;
      }
    }

    // Check request body
    if (request.body) {
      const bodyStr = JSON.stringify(request.body);
      if (checkSQLInjection(bodyStr)) {
        reply.status(403).send({
          error: 'Potential SQL injection detected in request body',
          waf_action: 'blocked'
        });
        return;
      }
    }
  });
  ` : ''}

  // XSS Protection Hook
  ${rules.includes('xss-protection') ? `
  fastify.addHook('preHandler', async (request, reply) => {
    const xssPatterns = [
      /<script[^>]*>.*?<\\/script>/gi,
      /<iframe[^>]*>.*?<\\/iframe>/gi,
      /javascript:/gi,
      /on\\w+\\s*=/gi
    ];

    const checkXSS = (str) => {
      return xssPatterns.some(pattern => pattern.test(str));
    };

    const checkObject = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj || {})) {
        if (typeof value === 'string' && checkXSS(value)) {
          reply.status(403).send({
            error: 'Potential XSS attack detected',
            blocked_field: \`\${path}\${key}\`,
            waf_action: 'blocked'
          });
          return true;
        } else if (typeof value === 'object' && value !== null) {
          if (checkObject(value, \`\${path}\${key}.\`)) return true;
        }
      }
      return false;
    };

    if (checkObject(request.query, 'query.')) return;
    if (checkObject(request.body, 'body.')) return;
  });
  ` : ''}

  // Audit Logging Hook
  fastify.addHook('onRequest', async (request, reply) => {
    const startTime = Date.now();
    request.wafStartTime = startTime;
    
    fastify.log.info(\`[WAF] \${request.method} \${request.url} from \${request.ip}\`);
  });

  fastify.addHook('onResponse', async (request, reply) => {
    const duration = Date.now() - request.wafStartTime;
    
    if (reply.statusCode >= 400) {
      fastify.log.warn(\`[WAF] Blocked request - Status: \${reply.statusCode}, IP: \${request.ip}, Path: \${request.url}\`);
    }
    
    fastify.log.info(\`[WAF] Request completed - Status: \${reply.statusCode}, Duration: \${duration}ms\`);
  });
}

module.exports = fp(wafPlugin, {
  fastify: '>=4.0.0',
  name: 'waf-security-plugin'
});

// Usage:
// await fastify.register(require('./waf-middleware'), {
//   rateLimit: { max: 50 },
//   security: { xssFilter: true }
// });
`;
}

function generateNextMiddleware(rules: string[]): string {
  return `
/* WAF Middleware for Next.js - AUTO-GENERATED */
import { NextRequest, NextResponse } from 'next/server';

interface WAFConfig {
  rateLimit?: {
    max: number;
    windowMs: number;
  };
  security?: {
    xssFilter: boolean;
    sqlInjection: boolean;
  };
}

class NextWAFMiddleware {
  private config: WAFConfig;
  private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  constructor(config: WAFConfig = {}) {
    this.config = {
      rateLimit: {
        max: 100,
        windowMs: 15 * 60 * 1000, // 15 minutes
        ...config.rateLimit
      },
      security: {
        xssFilter: true,
        sqlInjection: true,
        ...config.security
      }
    };
  }

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const rateLimitData = this.rateLimitMap.get(ip);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      this.rateLimitMap.set(ip, {
        count: 1,
        resetTime: now + this.config.rateLimit!.windowMs
      });
      return true;
    }

    if (rateLimitData.count >= this.config.rateLimit!.max) {
      return false;
    }

    rateLimitData.count++;
    return true;
  }

  private checkSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /('|(\\\\')|(;)|(\\\\;)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute)|(script)/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  private checkXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*?<\\/script>/gi,
      /<iframe[^>]*>.*?<\\/iframe>/gi,
      /javascript:/gi,
      /on\\w+\\s*=/gi
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  private validateRequest(request: NextRequest): { valid: boolean; error?: string } {
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
    
    // Rate limiting check
    ${rules.includes('rate-limiting') ? `
    if (!this.checkRateLimit(ip)) {
      return {
        valid: false,
        error: 'Rate limit exceeded'
      };
    }
    ` : ''}

    // URL and query parameter validation
    const url = request.nextUrl;
    const searchParams = url.searchParams;

    ${rules.includes('sql-injection') ? `
    // Check query parameters for SQL injection
    for (const [key, value] of searchParams.entries()) {
      if (this.checkSQLInjection(value)) {
        console.log(\`[WAF] SQL injection detected in query param: \${key}\`);
        return {
          valid: false,
          error: \`Potential SQL injection detected in parameter: \${key}\`
        };
      }
    }
    ` : ''}

    ${rules.includes('xss-protection') ? `
    // Check query parameters for XSS
    for (const [key, value] of searchParams.entries()) {
      if (this.checkXSS(value)) {
        console.log(\`[WAF] XSS attempt detected in query param: \${key}\`);
        return {
          valid: false,
          error: \`Potential XSS attack detected in parameter: \${key}\`
        };
      }
    }
    ` : ''}

    return { valid: true };
  }

  middleware() {
    return async (request: NextRequest) => {
      const startTime = Date.now();
      const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
      
      console.log(\`[WAF] \${new Date().toISOString()} - \${request.method} \${request.nextUrl.pathname} from \${ip}\`);

      // Validate request
      const validation = this.validateRequest(request);
      
      if (!validation.valid) {
        console.log(\`[WAF] Request blocked: \${validation.error}\`);
        
        return NextResponse.json(
          {
            error: validation.error,
            waf_action: 'blocked',
            timestamp: new Date().toISOString()
          },
          { 
            status: 403,
            headers: {
              'X-WAF-Action': 'blocked',
              'X-WAF-Reason': validation.error || 'Security violation'
            }
          }
        );
      }

      // Continue to next middleware/page
      const response = NextResponse.next();
      
      // Add security headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
      
      ${rules.includes('content-security-policy') ? `
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
      );
      ` : ''}

      const duration = Date.now() - startTime;
      console.log(\`[WAF] Request processed - Duration: \${duration}ms\`);

      return response;
    };
  }
}

// Export singleton instance
const wafInstance = new NextWAFMiddleware({
  rateLimit: { max: 100, windowMs: 15 * 60 * 1000 },
  security: { xssFilter: true, sqlInjection: true }
});

export const wafMiddleware = wafInstance.middleware();

// Usage in middleware.ts:
// import { wafMiddleware } from './lib/waf-middleware';
// export { wafMiddleware as middleware };
`;
}

function generateDjangoMiddleware(rules: string[]): string {
  return `
# WAF Middleware for Django - AUTO-GENERATED
import re
import time
import json
import logging
from django.http import JsonResponse
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger('waf')

class WAFMiddleware(MiddlewareMixin):
    def __init__(self, get_response=None):
        super().__init__(get_response)
        self.config = getattr(settings, 'WAF_CONFIG', {})
        self.rate_limit_max = self.config.get('RATE_LIMIT_MAX', 100)
        self.rate_limit_window = self.config.get('RATE_LIMIT_WINDOW', 900)  # 15 minutes
        
        # Compile patterns for better performance
        self.sql_patterns = [
            re.compile(r"('|(\\\\')|(;)|(\\\\;)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute)|(script))", re.IGNORECASE)
        ]
        
        self.xss_patterns = [
            re.compile(r'<script[^>]*>.*?</script>', re.IGNORECASE | re.DOTALL),
            re.compile(r'<iframe[^>]*>.*?</iframe>', re.IGNORECASE | re.DOTALL),
            re.compile(r'javascript:', re.IGNORECASE),
            re.compile(r'on\\w+\\s*=', re.IGNORECASE)
        ]

    def process_request(self, request):
        start_time = time.time()
        request.waf_start_time = start_time
        
        # Get client IP
        ip = self.get_client_ip(request)
        logger.info(f"[WAF] {request.method} {request.path} from {ip}")
        
        # Rate limiting check
        ${rules.includes('rate-limiting') ? `
        if not self.check_rate_limit(ip):
            logger.warning(f"[WAF] Rate limit exceeded for IP: {ip}")
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'waf_action': 'blocked',
                'retry_after': self.rate_limit_window
            }, status=429)
        ` : ''}

        # SQL Injection check
        ${rules.includes('sql-injection') ? `
        sql_check_result = self.check_sql_injection(request)
        if sql_check_result:
            logger.warning(f"[WAF] SQL injection detected: {sql_check_result}")
            return JsonResponse({
                'error': 'Potential SQL injection detected',
                'blocked_parameter': sql_check_result,
                'waf_action': 'blocked'
            }, status=403)
        ` : ''}

        # XSS check
        ${rules.includes('xss-protection') ? `
        xss_check_result = self.check_xss(request)
        if xss_check_result:
            logger.warning(f"[WAF] XSS attempt detected: {xss_check_result}")
            return JsonResponse({
                'error': 'Potential XSS attack detected',
                'blocked_field': xss_check_result,
                'waf_action': 'blocked'
            }, status=403)
        ` : ''}

        return None

    def process_response(self, request, response):
        # Add security headers
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        ${rules.includes('content-security-policy') ? `
        response['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: https:;"
        )
        ` : ''}

        # Log response
        if hasattr(request, 'waf_start_time'):
            duration = (time.time() - request.waf_start_time) * 1000
            if response.status_code >= 400:
                logger.warning(f"[WAF] Blocked request - Status: {response.status_code}, Duration: {duration:.2f}ms")
            else:
                logger.info(f"[WAF] Request completed - Status: {response.status_code}, Duration: {duration:.2f}ms")

        return response

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def check_rate_limit(self, ip):
        cache_key = f"waf_rate_limit_{ip}"
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= self.rate_limit_max:
            return False
        
        cache.set(cache_key, current_requests + 1, self.rate_limit_window)
        return True

    def check_sql_injection(self, request):
        # Check GET parameters
        for key, value in request.GET.items():
            if isinstance(value, str):
                for pattern in self.sql_patterns:
                    if pattern.search(value):
                        return f"query.{key}"
        
        # Check POST data
        if hasattr(request, 'POST'):
            for key, value in request.POST.items():
                if isinstance(value, str):
                    for pattern in self.sql_patterns:
                        if pattern.search(value):
                            return f"post.{key}"
        
        # Check JSON body
        if hasattr(request, 'body') and request.content_type == 'application/json':
            try:
                body_data = json.loads(request.body)
                result = self._check_dict_sql_injection(body_data, 'body')
                if result:
                    return result
            except (json.JSONDecodeError, AttributeError):
                pass
        
        return None

    def _check_dict_sql_injection(self, data, prefix=''):
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str):
                    for pattern in self.sql_patterns:
                        if pattern.search(value):
                            return f"{prefix}.{key}"
                elif isinstance(value, (dict, list)):
                    result = self._check_dict_sql_injection(value, f"{prefix}.{key}")
                    if result:
                        return result
        elif isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, str):
                    for pattern in self.sql_patterns:
                        if pattern.search(item):
                            return f"{prefix}[{i}]"
                elif isinstance(item, (dict, list)):
                    result = self._check_dict_sql_injection(item, f"{prefix}[{i}]")
                    if result:
                        return result
        return None

    def check_xss(self, request):
        # Check GET parameters
        for key, value in request.GET.items():
            if isinstance(value, str):
                for pattern in self.xss_patterns:
                    if pattern.search(value):
                        return f"query.{key}"
        
        # Check POST data
        if hasattr(request, 'POST'):
            for key, value in request.POST.items():
                if isinstance(value, str):
                    for pattern in self.xss_patterns:
                        if pattern.search(value):
                            return f"post.{key}"
        
        # Check JSON body
        if hasattr(request, 'body') and request.content_type == 'application/json':
            try:
                body_data = json.loads(request.body)
                result = self._check_dict_xss(body_data, 'body')
                if result:
                    return result
            except (json.JSONDecodeError, AttributeError):
                pass
        
        return None

    def _check_dict_xss(self, data, prefix=''):
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, str):
                    for pattern in self.xss_patterns:
                        if pattern.search(value):
                            return f"{prefix}.{key}"
                elif isinstance(value, (dict, list)):
                    result = self._check_dict_xss(value, f"{prefix}.{key}")
                    if result:
                        return result
        elif isinstance(data, list):
            for i, item in enumerate(data):
                if isinstance(item, str):
                    for pattern in self.xss_patterns:
                        if pattern.search(item):
                            return f"{prefix}[{i}]"
                elif isinstance(item, (dict, list)):
                    result = self._check_dict_xss(item, f"{prefix}[{i}]")
                    if result:
                        return result
        return None

# Settings configuration example:
# WAF_CONFIG = {
#     'RATE_LIMIT_MAX': 100,
#     'RATE_LIMIT_WINDOW': 900,  # 15 minutes in seconds
# }
#
# MIDDLEWARE = [
#     'path.to.WAFMiddleware',
#     # ... other middleware
# ]
`;
}

function generateLaravelMiddleware(rules: string[]): string {
  return `
<?php
// WAF Middleware for Laravel - AUTO-GENERATED

namespace App\\Http\\Middleware;

use Closure;
use Illuminate\\Http\\Request;
use Illuminate\\Http\\Response;
use Illuminate\\Support\\Facades\\Cache;
use Illuminate\\Support\\Facades\\Log;
use Symfony\\Component\\HttpFoundation\\Response as ResponseAlias;

class WAFMiddleware
{
    private array $config;
    private array $sqlPatterns;
    private array $xssPatterns;

    public function __construct()
    {
        $this->config = config('waf', [
            'rate_limit_max' => 100,
            'rate_limit_window' => 900, // 15 minutes in seconds
        ]);

        $this->sqlPatterns = [
            "/('|(\\\\\\\\')|(;)|(\\\\\\\\;)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute)|(script)/i"
        ];

        $this->xssPatterns = [
            "/<script[^>]*>.*?<\\/script>/is",
            "/<iframe[^>]*>.*?<\\/iframe>/is",
            "/javascript:/i",
            "/on\\\\w+\\\\s*=/i"
        ];
    }

    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);
        $ip = $request->ip();
        
        Log::info("[WAF] {$request->method()} {$request->path()} from {$ip}");

        // Rate limiting check
        ${rules.includes('rate-limiting') ? `
        if (!$this->checkRateLimit($ip)) {
            Log::warning("[WAF] Rate limit exceeded for IP: {$ip}");
            return response()->json([
                'error' => 'Rate limit exceeded',
                'waf_action' => 'blocked',
                'retry_after' => $this->config['rate_limit_window']
            ], 429);
        }
        ` : ''}

        // SQL Injection check
        ${rules.includes('sql-injection') ? `
        $sqlCheckResult = $this->checkSqlInjection($request);
        if ($sqlCheckResult) {
            Log::warning("[WAF] SQL injection detected: {$sqlCheckResult}");
            return response()->json([
                'error' => 'Potential SQL injection detected',
                'blocked_parameter' => $sqlCheckResult,
                'waf_action' => 'blocked'
            ], 403);
        }
        ` : ''}

        // XSS check
        ${rules.includes('xss-protection') ? `
        $xssCheckResult = $this->checkXss($request);
        if ($xssCheckResult) {
            Log::warning("[WAF] XSS attempt detected: {$xssCheckResult}");
            return response()->json([
                'error' => 'Potential XSS attack detected',
                'blocked_field' => $xssCheckResult,
                'waf_action' => 'blocked'
            ], 403);
        }
        ` : ''}

        $response = $next($request);

        // Add security headers
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-XSS-Protection', '1; mode=block');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        ${rules.includes('content-security-policy') ? `
        $response->headers->set('Content-Security-Policy', 
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https;"
        );
        ` : ''}

        // Log response
        $duration = (microtime(true) - $startTime) * 1000;
        if ($response->getStatusCode() >= 400) {
            Log::warning("[WAF] Blocked request - Status: {$response->getStatusCode()}, Duration: " . number_format($duration, 2) . "ms");
        } else {
            Log::info("[WAF] Request completed - Status: {$response->getStatusCode()}, Duration: " . number_format($duration, 2) . "ms");
        }

        return $response;
    }

    private function checkRateLimit(string $ip): bool
    {
        $cacheKey = "waf_rate_limit_{$ip}";
        $currentRequests = Cache::get($cacheKey, 0);

        if ($currentRequests >= $this->config['rate_limit_max']) {
            return false;
        }

        Cache::put($cacheKey, $currentRequests + 1, $this->config['rate_limit_window']);
        return true;
    }

    private function checkSqlInjection(Request $request): ?string
    {
        // Check query parameters
        foreach ($request->query() as $key => $value) {
            if (is_string($value)) {
                foreach ($this->sqlPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return "query.{$key}";
                    }
                }
            }
        }

        // Check request input
        foreach ($request->all() as $key => $value) {
            if (is_string($value)) {
                foreach ($this->sqlPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return "input.{$key}";
                    }
                }
            }
        }

        // Check JSON content
        if ($request->isJson()) {
            $result = $this->checkArraySqlInjection($request->json()->all(), 'json');
            if ($result) {
                return $result;
            }
        }

        return null;
    }

    private function checkArraySqlInjection(array $data, string $prefix = ''): ?string
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                foreach ($this->sqlPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return "{$prefix}.{$key}";
                    }
                }
            } elseif (is_array($value)) {
                $result = $this->checkArraySqlInjection($value, "{$prefix}.{$key}");
                if ($result) {
                    return $result;
                }
            }
        }
        return null;
    }

    private function checkXss(Request $request): ?string
    {
        // Check query parameters
        foreach ($request->query() as $key => $value) {
            if (is_string($value)) {
                foreach ($this->xssPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return "query.{$key}";
                    }
                }
            }
        }

        // Check request input
        foreach ($request->all() as $key => $value) {
            if (is_string($value)) {
                foreach ($this->xssPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return "input.{$key}";
                    }
                }
            }
        }

        // Check JSON content
        if ($request->isJson()) {
            $result = $this->checkArrayXss($request->json()->all(), 'json');
            if ($result) {
                return $result;
            }
        }

        return null;
    }

    private function checkArrayXss(array $data, string $prefix = ''): ?string
    {
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                foreach ($this->xssPatterns as $pattern) {
                    if (preg_match($pattern, $value)) {
                        return "{$prefix}.{$key}";
                    }
                }
            } elseif (is_array($value)) {
                $result = $this->checkArrayXss($value, "{$prefix}.{$key}");
                if ($result) {
                    return $result;
                }
            }
        }
        return null;
    }
}

/*
Configuration file (config/waf.php):

<?php
return [
    'rate_limit_max' => env('WAF_RATE_LIMIT_MAX', 100),
    'rate_limit_window' => env('WAF_RATE_LIMIT_WINDOW', 900), // 15 minutes
];

Register in app/Http/Kernel.php:
protected $middleware = [
    \\App\\Http\\Middleware\\WAFMiddleware::class,
    // ... other middleware
];
*/
`;
}

function generateGenericMiddleware(rules: string[]): string {
  return `
/* Generic WAF Middleware - AUTO-GENERATED */
/* This is a framework-agnostic security middleware template */

class GenericWAFMiddleware {
  constructor(config = {}) {
    this.config = {
      rateLimitMax: 100,
      rateLimitWindow: 15 * 60 * 1000, // 15 minutes
      logLevel: 'info',
      ...config
    };
    
    this.rateLimitStore = new Map();
    this.sqlPatterns = [
      /('|(\\\\')|(;)|(\\\\;)|(union)|(select)|(insert)|(drop)|(delete)|(update)|(create)|(alter)|(exec)|(execute)|(script)/i
    ];
    
    this.xssPatterns = [
      /<script[^>]*>.*?<\\/script>/gi,
      /<iframe[^>]*>.*?<\\/iframe>/gi,
      /javascript:/gi,
      /on\\w+\\s*=/gi
    ];
  }

  // Main middleware function
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      const clientIP = this.getClientIP(req);
      
      this.log('info', \`Request: \${req.method} \${req.url} from \${clientIP}\`);

      // Security checks
      const securityCheck = this.performSecurityChecks(req);
      if (!securityCheck.passed) {
        this.log('warn', \`Security violation: \${securityCheck.reason}\`);
        return this.blockRequest(res, securityCheck.reason);
      }

      // Add security headers
      this.addSecurityHeaders(res);

      // Continue to next middleware
      const originalEnd = res.end;
      res.end = (...args) => {
        const duration = Date.now() - startTime;
        this.log('info', \`Response: \${res.statusCode} in \${duration}ms\`);
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  performSecurityChecks(req) {
    ${rules.includes('rate-limiting') ? `
    // Rate limiting check
    if (!this.checkRateLimit(this.getClientIP(req))) {
      return { passed: false, reason: 'Rate limit exceeded' };
    }
    ` : ''}

    ${rules.includes('sql-injection') ? `
    // SQL injection check
    const sqlResult = this.checkSQLInjection(req);
    if (sqlResult) {
      return { passed: false, reason: \`SQL injection detected: \${sqlResult}\` };
    }
    ` : ''}

    ${rules.includes('xss-protection') ? `
    // XSS check
    const xssResult = this.checkXSS(req);
    if (xssResult) {
      return { passed: false, reason: \`XSS attempt detected: \${xssResult}\` };
    }
    ` : ''}

    return { passed: true };
  }

  checkRateLimit(ip) {
    const now = Date.now();
    const rateLimitData = this.rateLimitStore.get(ip);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      this.rateLimitStore.set(ip, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow
      });
      return true;
    }

    if (rateLimitData.count >= this.config.rateLimitMax) {
      return false;
    }

    rateLimitData.count++;
    return true;
  }

  checkSQLInjection(req) {
    // Check URL parameters
    const url = new URL(req.url, 'http://localhost');
    for (const [key, value] of url.searchParams) {
      for (const pattern of this.sqlPatterns) {
        if (pattern.test(value)) {
          return \`query.\${key}\`;
        }
      }
    }

    // Check request body if present
    if (req.body) {
      const result = this.checkObjectForPatterns(req.body, this.sqlPatterns, 'body');
      if (result) return result;
    }

    return null;
  }

  checkXSS(req) {
    // Check URL parameters
    const url = new URL(req.url, 'http://localhost');
    for (const [key, value] of url.searchParams) {
      for (const pattern of this.xssPatterns) {
        if (pattern.test(value)) {
          return \`query.\${key}\`;
        }
      }
    }

    // Check request body if present
    if (req.body) {
      const result = this.checkObjectForPatterns(req.body, this.xssPatterns, 'body');
      if (result) return result;
    }

    return null;
  }

  checkObjectForPatterns(obj, patterns, prefix = '') {
    if (typeof obj === 'string') {
      for (const pattern of patterns) {
        if (pattern.test(obj)) {
          return prefix;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const result = this.checkObjectForPatterns(value, patterns, \`\${prefix}.\${key}\`);
        if (result) return result;
      }
    }
    return null;
  }

  addSecurityHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    ${rules.includes('content-security-policy') ? `
    res.setHeader('Content-Security-Policy', 
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"
    );
    ` : ''}
  }

  blockRequest(res, reason) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: reason,
      waf_action: 'blocked',
      timestamp: new Date().toISOString()
    }));
  }

  getClientIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip || 
           'unknown';
  }

  log(level, message) {
    if (this.config.logLevel === 'info' || level === 'warn' || level === 'error') {
      console.log(\`[\${new Date().toISOString()}] [WAF] [\${level.toUpperCase()}] \${message}\`);
    }
  }
}

// Usage example:
// const waf = new GenericWAFMiddleware({
//   rateLimitMax: 50,
//   rateLimitWindow: 10 * 60 * 1000, // 10 minutes
//   logLevel: 'info'
// });
// 
// app.use(waf.middleware());

module.exports = GenericWAFMiddleware;
`;
}

function generateConfigTemplate(framework: string, securityLevel: string) {
  return {
    framework,
    security_level: securityLevel,
    waf_settings: {
      rate_limiting: {
        enabled: true,
        max_requests: 100,
        window_minutes: 15
      },
      sql_injection_protection: {
        enabled: true,
        strict_mode: securityLevel === 'strict'
      },
      xss_protection: {
        enabled: true,
        filter_mode: 'block'
      },
      content_security_policy: {
        enabled: securityLevel !== 'basic',
        directives: {
          'default-src': ["'self'"],
          'script-src': ["'self'", "'unsafe-inline'"],
          'style-src': ["'self'", "'unsafe-inline'"],
          'img-src': ["'self'", "data:", "https:"]
        }
      },
      security_headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      }
    },
    logging: {
      enabled: true,
      level: 'info',
      audit_trail: true
    }
  };
}

function generatePackageConfig(framework: string) {
  const basePackages = {
    express: {
      dependencies: {
        'helmet': '^7.0.0',
        'express-rate-limit': '^7.0.0',
        'express-validator': '^7.0.0'
      }
    },
    fastify: {
      dependencies: {
        '@fastify/helmet': '^11.0.0',
        '@fastify/rate-limit': '^9.0.0'
      }
    },
    next: {
      dependencies: {}
    },
    django: {
      requirements: [
        'django-ratelimit>=4.0.0',
        'django-csp>=3.7'
      ]
    },
    laravel: {
      composer: {
        'spatie/laravel-csp': '^2.8'
      }
    }
  };

  return basePackages[framework as keyof typeof basePackages] || {};
}

function generateDockerConfig(framework: string) {
  return `
# WAF-enabled Dockerfile for ${framework}
FROM node:18-alpine AS base
WORKDIR /app

# Install WAF dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy WAF middleware
COPY waf-middleware.js ./
COPY waf.config.json ./

# Copy application files
COPY . .

# Set WAF environment variables
ENV WAF_ENABLED=true
ENV WAF_LOG_LEVEL=info
ENV WAF_RATE_LIMIT_MAX=100

# Health check with WAF validation
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000

# Start with WAF protection
CMD ["node", "server.js"]
`;
}

function generateEnvironmentVars(config: any) {
  return {
    WAF_ENABLED: 'true',
    WAF_LOG_LEVEL: 'info',
    WAF_RATE_LIMIT_MAX: '100',
    WAF_RATE_LIMIT_WINDOW: '900000',
    WAF_SQL_INJECTION_PROTECTION: 'true',
    WAF_XSS_PROTECTION: 'true',
    WAF_CONTENT_SECURITY_POLICY: config.security_level !== 'basic' ? 'true' : 'false',
    WAF_AUDIT_LOGGING: 'true'
  };
}

function getFileExtension(framework: string): string {
  const extensions = {
    express: 'js',
    fastify: 'js',
    next: 'ts',
    django: 'py',
    laravel: 'php'
  };
  return extensions[framework as keyof typeof extensions] || 'js';
}

function getInstallationCommands(framework: string): string[] {
  const commands = {
    express: [
      'npm install helmet express-rate-limit express-validator',
      'cp waf-middleware.js ./middleware/',
      'node setup-waf.js'
    ],
    fastify: [
      'npm install @fastify/helmet @fastify/rate-limit',
      'cp waf-plugin.js ./plugins/',
      'node setup-waf.js'
    ],
    next: [
      'cp waf-middleware.ts ./lib/',
      'cp middleware.ts ./',
      'npm run build'
    ],
    django: [
      'pip install django-ratelimit django-csp',
      'cp waf_middleware.py ./middleware/',
      'python manage.py migrate'
    ],
    laravel: [
      'composer require spatie/laravel-csp',
      'cp WAFMiddleware.php app/Http/Middleware/',
      'php artisan config:cache'
    ]
  };
  return commands[framework as keyof typeof commands] || ['# Framework-specific installation commands'];
}

function getIntegrationGuide(framework: string): string {
  const guides = {
    express: `
1. Install dependencies: npm install helmet express-rate-limit express-validator
2. Copy waf-middleware.js to your middleware directory
3. In your main app file:
   const WAFMiddleware = require('./middleware/waf-middleware');
   const waf = new WAFMiddleware();
   app.use(waf.protect());
4. Configure WAF settings in waf.config.json
5. Test with: curl -X POST http://localhost:3000/test?param=<script>alert(1)</script>
`,
    fastify: `
1. Install dependencies: npm install @fastify/helmet @fastify/rate-limit
2. Copy waf-plugin.js to your plugins directory
3. Register the plugin:
   await fastify.register(require('./plugins/waf-plugin'));
4. Configure in your fastify options
5. Test security rules with malicious payloads
`,
    next: `
1. Copy waf-middleware.ts to your lib directory
2. Create middleware.ts in your project root:
   export { wafMiddleware as middleware } from './lib/waf-middleware';
3. Configure matcher in middleware.ts if needed
4. Test with API routes or pages
5. Monitor logs for blocked requests
`,
    django: `
1. Install: pip install django-ratelimit django-csp
2. Copy waf_middleware.py to your middleware directory
3. Add to MIDDLEWARE in settings.py:
   'your_app.middleware.WAFMiddleware'
4. Configure WAF_CONFIG in settings.py
5. Run: python manage.py migrate
6. Test with malicious payloads in forms/API endpoints
`,
    laravel: `
1. Install: composer require spatie/laravel-csp
2. Copy WAFMiddleware.php to app/Http/Middleware/
3. Register in app/Http/Kernel.php middleware array
4. Publish config: php artisan vendor:publish --provider="Spatie\\Csp\\CspServiceProvider"
5. Configure in config/waf.php
6. Test with: php artisan serve and send test requests
`
  };
  return guides[framework as keyof typeof guides] || 'Generic integration guide not available';
}

async function getSupportedFrameworks() {
  const frameworks = [
    {
      name: 'express',
      display_name: 'Express.js',
      language: 'JavaScript/Node.js',
      features: ['Rate Limiting', 'SQL Injection Protection', 'XSS Protection', 'Security Headers', 'CSRF Protection'],
      maturity: 'stable'
    },
    {
      name: 'fastify',
      display_name: 'Fastify',
      language: 'JavaScript/Node.js',
      features: ['Rate Limiting', 'SQL Injection Protection', 'XSS Protection', 'Security Headers', 'High Performance'],
      maturity: 'stable'
    },
    {
      name: 'next',
      display_name: 'Next.js',
      language: 'TypeScript/React',
      features: ['Middleware', 'API Route Protection', 'SSR Security', 'Static Generation Safe'],
      maturity: 'stable'
    },
    {
      name: 'django',
      display_name: 'Django',
      language: 'Python',
      features: ['Middleware', 'ORM Protection', 'CSRF Built-in', 'Admin Interface Safe'],
      maturity: 'stable'
    },
    {
      name: 'laravel',
      display_name: 'Laravel',
      language: 'PHP',
      features: ['Middleware', 'Eloquent Protection', 'Blade Template Safe', 'Artisan Commands'],
      maturity: 'stable'
    }
  ];

  return new Response(
    JSON.stringify({
      success: true,
      frameworks: frameworks,
      total_supported: frameworks.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateMiddlewareCode(config: any) {
  const middlewareCode = generateFrameworkMiddleware(config.framework, config.security_level);
  
  return new Response(
    JSON.stringify({
      success: true,
      framework: config.framework,
      security_level: config.security_level,
      middleware_code: middlewareCode,
      file_name: `waf-middleware.${getFileExtension(config.framework)}`,
      installation_commands: getInstallationCommands(config.framework)
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createDockerConfiguration(config: any) {
  const dockerConfig = generateDockerConfig(config.framework);
  
  return new Response(
    JSON.stringify({
      success: true,
      framework: config.framework,
      docker_config: dockerConfig,
      docker_file_name: 'Dockerfile.waf',
      docker_compose_additions: {
        environment: [
          'WAF_ENABLED=true',
          'WAF_LOG_LEVEL=info'
        ],
        healthcheck: {
          test: ['CMD', 'curl', '-f', 'http://localhost:3000/health'],
          interval: '30s',
          timeout: '3s',
          retries: 3
        }
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
