-- WAF Rules Module
local _M = {}

-- Default WAF Rules
_M.rules = {
    -- SQL Injection Rules
    {
        id = "SQL_INJECTION_1",
        name = "SQL Injection Detection - Basic",
        pattern = [[(union|select|insert|delete|update|drop|create|alter|exec|execute)\s+.*\s+(from|into|where|values)]],
        action = "block",
        severity = "high",
        enabled = true
    },
    {
        id = "SQL_INJECTION_2", 
        name = "SQL Injection Detection - Comments",
        pattern = [[(/\*|\*/|--|#|\+\s*union|\+\s*select)]],
        action = "block",
        severity = "high",
        enabled = true
    },
    
    -- XSS Rules
    {
        id = "XSS_1",
        name = "XSS Detection - Script Tags",
        pattern = [[\<\s*script[^>]*\>.*?\<\s*/\s*script\s*\>]],
        action = "block",
        severity = "medium",
        enabled = true
    },
    {
        id = "XSS_2",
        name = "XSS Detection - Event Handlers",
        pattern = [[(onload|onerror|onclick|onmouseover|onkeyup|onfocus)\s*=]],
        action = "block",
        severity = "medium", 
        enabled = true
    },
    
    -- Path Traversal Rules
    {
        id = "PATH_TRAVERSAL_1",
        name = "Path Traversal Detection",
        pattern = [[\.\./|\.\.\\\|%2e%2e%2f|%2e%2e%5c]],
        action = "block",
        severity = "high",
        enabled = true
    },
    
    -- Command Injection Rules  
    {
        id = "CMD_INJECTION_1",
        name = "Command Injection Detection",
        pattern = [[(\||;|&|`|\$\(|\${).*?(whoami|id|cat|ls|ps|netstat|ifconfig|ping|wget|curl)]],
        action = "block",
        severity = "high",
        enabled = true
    }
}

-- Rate limiting configuration
_M.rate_limits = {
    requests_per_minute = 60,
    requests_per_hour = 1000,
    burst_size = 10
}

-- IP whitelist (development)
_M.ip_whitelist = {
    "127.0.0.1",
    "::1",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "10.0.0.0/8"
}

-- User agent patterns to block
_M.blocked_user_agents = {
    "sqlmap",
    "nikto", 
    "nessus",
    "burp",
    "havij",
    "w3af"
}

function _M.get_rules()
    return _M.rules
end

function _M.get_rate_limits()
    return _M.rate_limits  
end

function _M.get_ip_whitelist()
    return _M.ip_whitelist
end

function _M.get_blocked_user_agents()
    return _M.blocked_user_agents
end

return _M