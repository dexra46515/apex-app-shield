-- Developer WAF Engine
local cjson = require "cjson"

local WAF = {}
WAF.__index = WAF

function WAF:new()
    local waf = {
        policies = {},
        rules = {},
        rule_count = 0,
        policy_count = 0,
        debug_mode = os.getenv("WAF_DEBUG") == "true"
    }
    setmetatable(waf, WAF)
    return waf
end

function WAF:load_policies(policy_dir)
    self.policies = {}
    self.rules = {}
    self.policy_count = 0
    
    -- Load default security rules
    self:load_default_rules()
    
    -- Load custom policies from directory
    local lfs = require "lfs"
    if lfs then
        for file in lfs.dir(policy_dir) do
            if file:match("%.yaml$") or file:match("%.json$") then
                local success = self:load_policy_file(policy_dir .. "/" .. file)
                if success then
                    self.policy_count = self.policy_count + 1
                end
            end
        end
    end
    
    ngx.log(ngx.INFO, "WAF: Loaded " .. self.policy_count .. " policies with " .. self.rule_count .. " rules")
    return true
end

function WAF:load_default_rules()
    -- SQL Injection rules
    table.insert(self.rules, {
        id = "SQL_INJECTION_001",
        name = "SQL Injection - Union Select",
        pattern = "union.*select",
        flags = "i",
        severity = "high",
        action = "block",
        status_code = 403
    })
    
    table.insert(self.rules, {
        id = "SQL_INJECTION_002", 
        name = "SQL Injection - OR 1=1",
        pattern = "or\\s+['\"]?1['\"]?\\s*=\\s*['\"]?1",
        flags = "i",
        severity = "high",
        action = "block",
        status_code = 403
    })
    
    -- XSS rules
    table.insert(self.rules, {
        id = "XSS_001",
        name = "XSS - Script Tag",
        pattern = "<script[^>]*>.*?</script>",
        flags = "i",
        severity = "high", 
        action = "block",
        status_code = 403
    })
    
    table.insert(self.rules, {
        id = "XSS_002",
        name = "XSS - Event Handler",
        pattern = "on(load|error|click|mouse)\\s*=",
        flags = "i",
        severity = "high",
        action = "block",
        status_code = 403
    })
    
    -- Path Traversal rules
    table.insert(self.rules, {
        id = "PATH_TRAVERSAL_001",
        name = "Path Traversal - Directory Climbing",
        pattern = "\\.\\./",
        flags = "",
        severity = "high",
        action = "block", 
        status_code = 403
    })
    
    -- Rate limiting rule
    table.insert(self.rules, {
        id = "RATE_LIMIT_001",
        name = "Global Rate Limit",
        type = "rate_limit",
        limit = 100,
        window = 60,
        action = "challenge",
        status_code = 429
    })
    
    self.rule_count = #self.rules
end

function WAF:load_policy_file(filepath)
    local file = io.open(filepath, "r")
    if not file then
        ngx.log(ngx.ERR, "WAF: Cannot open policy file: " .. filepath)
        return false
    end
    
    local content = file:read("*all")
    file:close()
    
    local policy
    if filepath:match("%.json$") then
        local ok
        ok, policy = pcall(cjson.decode, content)
        if not ok then
            ngx.log(ngx.ERR, "WAF: Invalid JSON in policy file: " .. filepath)
            return false
        end
    else
        -- Simple YAML parser for basic policies
        policy = self:parse_yaml_policy(content)
    end
    
    if policy and policy.rules then
        for _, rule in ipairs(policy.rules) do
            table.insert(self.rules, rule)
            self.rule_count = self.rule_count + 1
        end
        return true
    end
    
    return false
end

function WAF:parse_yaml_policy(content)
    -- Simple YAML parser for basic security policies
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

function WAF:process_request(request_data)
    local result = {
        action = "allow",
        threat_score = 0,
        rule_matches = {},
        processing_details = {}
    }
    
    if self.debug_mode then
        result.debug_info = {
            request_id = request_data.id,
            timestamp = ngx.time(),
            rules_evaluated = 0
        }
    end
    
    -- Process each rule
    for _, rule in ipairs(self.rules) do
        if self.debug_mode then
            result.debug_info.rules_evaluated = result.debug_info.rules_evaluated + 1
        end
        
        local match_result = self:evaluate_rule(rule, request_data)
        if match_result.matched then
            table.insert(result.rule_matches, rule.id)
            result.threat_score = result.threat_score + (match_result.score or 10)
            
            table.insert(result.processing_details, {
                rule_id = rule.id,
                rule_name = rule.name,
                matched_value = match_result.matched_value,
                action = rule.action
            })
            
            -- Determine final action (most restrictive wins)
            if rule.action == "block" and result.action ~= "block" then
                result.action = "block"
                result.status_code = rule.status_code or 403
            elseif rule.action == "challenge" and result.action == "allow" then
                result.action = "challenge"
                result.status_code = rule.status_code or 429
            end
        end
    end
    
    -- Store request for replay capability
    if os.getenv("WAF_ENABLE_REPLAY") == "true" then
        self:store_request_for_replay(request_data, result)
    end
    
    return result
end

function WAF:evaluate_rule(rule, request_data)
    local result = { matched = false, score = 0 }
    
    if rule.type == "rate_limit" then
        return self:check_rate_limit(rule, request_data)
    end
    
    -- Pattern matching rules
    if rule.pattern then
        local test_strings = {
            request_data.uri,
            request_data.body or "",
            request_data.user_agent or ""
        }
        
        -- Check URL parameters
        if request_data.args then
            for _, value in pairs(request_data.args) do
                if type(value) == "string" then
                    table.insert(test_strings, value)
                end
            end
        end
        
        -- Check headers
        if request_data.headers then
            for _, value in pairs(request_data.headers) do
                if type(value) == "string" then
                    table.insert(test_strings, value)
                end
            end
        end
        
        for _, test_string in ipairs(test_strings) do
            local flags = rule.flags or ""
            local match = ngx.re.match(test_string, rule.pattern, flags)
            if match then
                result.matched = true
                result.matched_value = match[0]
                result.score = self:calculate_threat_score(rule.severity)
                break
            end
        end
    end
    
    return result
end

function WAF:check_rate_limit(rule, request_data)
    local key = "rate_limit_" .. rule.id .. "_" .. request_data.source_ip
    local cache = ngx.shared.waf_cache
    
    local current_count = cache:get(key) or 0
    if current_count >= rule.limit then
        return { 
            matched = true, 
            score = 50,
            matched_value = "Rate limit exceeded: " .. current_count .. "/" .. rule.limit
        }
    end
    
    cache:incr(key, 1, 0, rule.window)
    return { matched = false }
end

function WAF:calculate_threat_score(severity)
    local scores = {
        low = 10,
        medium = 25,
        high = 50,
        critical = 100
    }
    return scores[severity] or 10
end

function WAF:store_request_for_replay(request_data, waf_result)
    -- Store in shared memory for replay capability
    local replay_data = {
        request = request_data,
        waf_result = waf_result,
        timestamp = ngx.time()
    }
    
    local key = "replay_" .. request_data.id
    local cache = ngx.shared.waf_cache
    cache:set(key, cjson.encode(replay_data), 3600) -- Store for 1 hour
end

function WAF:replay_request(replay_request, debug_enabled)
    local stored_key = "replay_" .. replay_request.request_id
    local cache = ngx.shared.waf_cache
    local stored_data = cache:get(stored_key)
    
    if not stored_data then
        return {
            success = false,
            error = "Request not found in replay cache",
            request_id = replay_request.request_id
        }
    end
    
    local original_data = cjson.decode(stored_data)
    
    -- Re-process with debug enabled
    local old_debug = self.debug_mode
    self.debug_mode = debug_enabled
    
    local replay_result = self:process_request(original_data.request)
    replay_result.original_result = original_data.waf_result
    replay_result.replay_timestamp = ngx.time()
    
    self.debug_mode = old_debug
    
    return {
        success = true,
        original_request = original_data.request,
        original_result = original_data.waf_result,
        replay_result = replay_result
    }
end

function WAF:reload_policies(policy_dir)
    ngx.log(ngx.INFO, "WAF: Reloading policies from " .. policy_dir)
    return self:load_policies(policy_dir)
end

function WAF:get_policy_count()
    return self.policy_count
end

function WAF:get_active_rules_count()
    return self.rule_count
end

return WAF