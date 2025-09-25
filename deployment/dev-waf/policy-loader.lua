-- Policy Loader Module for WAF
local _M = {}

local json = require "cjson"
local io = require "io"
local lfs = require "lfs"

-- Simple YAML parser (copied from waf-engine.lua)
local function parse_yaml_policy(content)
    local policy = { rules = {} }
    local current_rule = nil
    
    for line in content:gmatch("[^\r\n]+") do
        line = line:gsub("^%s+", ""):gsub("%s+$", "")
        
        if line:match("^%-") then
            if current_rule then
                table.insert(policy.rules, current_rule)
            end
            current_rule = {}
        elseif line:match(":") and current_rule then
            local key, value = line:match("([^:]+):%s*(.+)")
            if key and value then
                key = key:gsub("^%s+", ""):gsub("%s+$", "")
                value = value:gsub("^['\"]", ""):gsub("['\"]$", "")
                current_rule[key] = value
            end
        end
    end
    
    if current_rule then
        table.insert(policy.rules, current_rule)
    end
    
    return policy
end

-- Policy directory
local POLICY_DIR = "/usr/local/openresty/waf/policies"

-- Cache for loaded policies
local policy_cache = {}
local cache_timestamp = 0

-- Load YAML policy file
local function load_yaml_policy(file_path)
    local file = io.open(file_path, "r")
    if not file then
        ngx.log(ngx.ERR, "Cannot open policy file: " .. file_path)
        return nil
    end
    
    local content = file:read("*all")
    file:close()
    
    local ok, policy = pcall(parse_yaml_policy, content)
    if not ok then
        ngx.log(ngx.ERR, "Error parsing YAML policy: " .. file_path .. " - " .. policy)
        return nil
    end
    
    return policy
end

-- Load JSON policy file
local function load_json_policy(file_path)
    local file = io.open(file_path, "r")
    if not file then
        ngx.log(ngx.ERR, "Cannot open policy file: " .. file_path)
        return nil
    end
    
    local content = file:read("*all")
    file:close()
    
    local ok, policy = pcall(json.decode, content)
    if not ok then
        ngx.log(ngx.ERR, "Error parsing JSON policy: " .. file_path .. " - " .. policy)
        return nil
    end
    
    return policy
end

-- Get file modification time
local function get_mtime(file_path)
    local attr = lfs.attributes(file_path)
    return attr and attr.modification or 0
end

-- Check if policies need reload
local function need_reload()
    local max_mtime = 0
    
    for file in lfs.dir(POLICY_DIR) do
        if file ~= "." and file ~= ".." then
            local file_path = POLICY_DIR .. "/" .. file
            local mtime = get_mtime(file_path)
            if mtime > max_mtime then
                max_mtime = mtime
            end
        end
    end
    
    return max_mtime > cache_timestamp
end

-- Load all policies from directory
function _M.load_policies()
    if not need_reload() and next(policy_cache) then
        return policy_cache
    end
    
    ngx.log(ngx.INFO, "Loading WAF policies from: " .. POLICY_DIR)
    
    local policies = {}
    local file_count = 0
    
    -- Check if policy directory exists
    local attr = lfs.attributes(POLICY_DIR)
    if not attr or attr.mode ~= "directory" then
        ngx.log(ngx.WARN, "Policy directory not found: " .. POLICY_DIR)
        return {}
    end
    
    -- Load all policy files
    for file in lfs.dir(POLICY_DIR) do
        if file ~= "." and file ~= ".." then
            local file_path = POLICY_DIR .. "/" .. file
            local policy = nil
            
            if file:match("%.ya?ml$") then
                policy = load_yaml_policy(file_path)
            elseif file:match("%.json$") then
                policy = load_json_policy(file_path)
            end
            
            if policy then
                policies[file] = policy
                file_count = file_count + 1
                ngx.log(ngx.INFO, "Loaded policy file: " .. file)
            end
        end
    end
    
    -- Update cache
    policy_cache = policies
    cache_timestamp = ngx.time()
    
    ngx.log(ngx.INFO, "Loaded " .. file_count .. " policy files")
    return policies
end

-- Get merged rules from all policies
function _M.get_merged_rules()
    local policies = _M.load_policies()
    local merged_rules = {}
    
    for filename, policy in pairs(policies) do
        if policy.security and policy.security.rules then
            for _, rule in ipairs(policy.security.rules) do
                -- Add policy filename for tracking
                rule._policy_file = filename
                table.insert(merged_rules, rule)
            end
        end
    end
    
    return merged_rules
end

-- Get rate limiting configuration
function _M.get_rate_limit_config()
    local policies = _M.load_policies()
    
    -- Default configuration
    local config = {
        requests_per_minute = 60,
        requests_per_hour = 1000,
        burst_size = 10
    }
    
    -- Override with policy configurations
    for filename, policy in pairs(policies) do
        if policy.rate_limiting then
            for key, value in pairs(policy.rate_limiting) do
                config[key] = value
            end
        end
    end
    
    return config
end

-- Get IP whitelist from policies
function _M.get_ip_whitelist()
    local policies = _M.load_policies()
    local whitelist = {}
    
    for filename, policy in pairs(policies) do
        if policy.ip_whitelist then
            for _, ip in ipairs(policy.ip_whitelist) do
                table.insert(whitelist, ip)
            end
        end
    end
    
    return whitelist
end

-- Get blocked user agents
function _M.get_blocked_user_agents()
    local policies = _M.load_policies()
    local blocked_agents = {}
    
    for filename, policy in pairs(policies) do
        if policy.blocked_user_agents then
            for _, agent in ipairs(policy.blocked_user_agents) do
                table.insert(blocked_agents, agent)
            end
        end
    end
    
    return blocked_agents
end

-- Reload policies (for API endpoint)
function _M.reload()
    policy_cache = {}
    cache_timestamp = 0
    return _M.load_policies()
end

return _M