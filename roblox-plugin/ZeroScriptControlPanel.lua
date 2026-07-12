--!strict
-- ZeroScript Control Panel v1.24.0
-- Optional local Studio DockWidget. It talks only to the authenticated
-- 127.0.0.1 control API started by start_with_panel.bat.

local HttpService = game:GetService("HttpService")

local DEFAULT_URL = "http://127.0.0.1:17614"
local SETTINGS_URL = "ZeroScriptControlUrl"
local SETTINGS_TOKEN = "ZeroScriptControlToken"

local toolbar = plugin:CreateToolbar("ZeroScript")
local toggleButton = toolbar:CreateButton(
    "ZeroScriptControl",
    "Open the ZeroScript task and safety panel",
    "rbxassetid://4458901886",
    "Control Center"
)
toggleButton.ClickableWhenViewportHidden = true

local widgetInfo = DockWidgetPluginGuiInfo.new(
    Enum.InitialDockState.Right,
    false,
    false,
    360,
    500,
    300,
    340
)
local widget = plugin:CreateDockWidgetPluginGui("ZeroScriptControlPanelV124", widgetInfo)
widget.Title = "ZeroScript Control Center"
widget.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

local function create(className: string, properties: {[string]: any}, parent: Instance?): Instance
    local instance = Instance.new(className)
    for key, value in pairs(properties) do
        (instance :: any)[key] = value
    end
    if parent then
        instance.Parent = parent
    end
    return instance
end

local root = create("Frame", {
    Name = "Root",
    Size = UDim2.fromScale(1, 1),
    BackgroundColor3 = Color3.fromRGB(20, 20, 28),
    BorderSizePixel = 0,
}, widget) :: Frame

create("UIPadding", {
    PaddingTop = UDim.new(0, 12),
    PaddingBottom = UDim.new(0, 12),
    PaddingLeft = UDim.new(0, 12),
    PaddingRight = UDim.new(0, 12),
}, root)

local layout = create("UIListLayout", {
    Padding = UDim.new(0, 8),
    FillDirection = Enum.FillDirection.Vertical,
    SortOrder = Enum.SortOrder.LayoutOrder,
}, root) :: UIListLayout

local function label(text: string, height: number, order: number, bold: boolean?): TextLabel
    return create("TextLabel", {
        LayoutOrder = order,
        Size = UDim2.new(1, 0, 0, height),
        BackgroundTransparency = 1,
        Text = text,
        TextColor3 = Color3.fromRGB(232, 232, 236),
        TextSize = bold and 16 or 13,
        Font = bold and Enum.Font.GothamBold or Enum.Font.Gotham,
        TextXAlignment = Enum.TextXAlignment.Left,
        TextYAlignment = Enum.TextYAlignment.Top,
        TextWrapped = true,
    }, root) :: TextLabel
end

label("ZeroScript", 24, 1, true)
local connectionLabel = label("Control API: not configured", 20, 2, false)

local urlBox = create("TextBox", {
    LayoutOrder = 3,
    Size = UDim2.new(1, 0, 0, 32),
    BackgroundColor3 = Color3.fromRGB(36, 36, 44),
    BorderSizePixel = 0,
    TextColor3 = Color3.fromRGB(232, 232, 236),
    PlaceholderColor3 = Color3.fromRGB(140, 140, 150),
    PlaceholderText = DEFAULT_URL,
    Text = tostring(plugin:GetSetting(SETTINGS_URL) or DEFAULT_URL),
    TextSize = 12,
    Font = Enum.Font.Code,
    ClearTextOnFocus = false,
    TextXAlignment = Enum.TextXAlignment.Left,
}, root) :: TextBox
create("UICorner", { CornerRadius = UDim.new(0, 7) }, urlBox)
create("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, urlBox)

local tokenBox = create("TextBox", {
    LayoutOrder = 4,
    Size = UDim2.new(1, 0, 0, 32),
    BackgroundColor3 = Color3.fromRGB(36, 36, 44),
    BorderSizePixel = 0,
    TextColor3 = Color3.fromRGB(232, 232, 236),
    PlaceholderColor3 = Color3.fromRGB(140, 140, 150),
    PlaceholderText = "Paste control_token.txt value",
    Text = tostring(plugin:GetSetting(SETTINGS_TOKEN) or ""),
    TextSize = 12,
    Font = Enum.Font.Code,
    ClearTextOnFocus = false,
    TextXAlignment = Enum.TextXAlignment.Left,
}, root) :: TextBox
create("UICorner", { CornerRadius = UDim.new(0, 7) }, tokenBox)
create("UIPadding", { PaddingLeft = UDim.new(0, 8), PaddingRight = UDim.new(0, 8) }, tokenBox)

local saveButton = create("TextButton", {
    LayoutOrder = 5,
    Size = UDim2.new(1, 0, 0, 30),
    BackgroundColor3 = Color3.fromRGB(79, 70, 229),
    BorderSizePixel = 0,
    Text = "Save connection settings",
    TextColor3 = Color3.new(1, 1, 1),
    TextSize = 13,
    Font = Enum.Font.GothamSemibold,
    AutoButtonColor = true,
}, root) :: TextButton
create("UICorner", { CornerRadius = UDim.new(0, 7) }, saveButton)

local runtimeCard = create("Frame", {
    LayoutOrder = 6,
    Size = UDim2.new(1, 0, 0, 156),
    BackgroundColor3 = Color3.fromRGB(28, 28, 36),
    BorderSizePixel = 0,
}, root) :: Frame
create("UICorner", { CornerRadius = UDim.new(0, 9) }, runtimeCard)
create("UIPadding", {
    PaddingTop = UDim.new(0, 10),
    PaddingBottom = UDim.new(0, 10),
    PaddingLeft = UDim.new(0, 10),
    PaddingRight = UDim.new(0, 10),
}, runtimeCard)
local runtimeText = create("TextLabel", {
    Size = UDim2.fromScale(1, 1),
    BackgroundTransparency = 1,
    Text = "STATE: IDLE\nWaiting for the browser extension.",
    TextColor3 = Color3.fromRGB(220, 220, 228),
    TextSize = 13,
    Font = Enum.Font.Code,
    TextXAlignment = Enum.TextXAlignment.Left,
    TextYAlignment = Enum.TextYAlignment.Top,
    TextWrapped = true,
}, runtimeCard) :: TextLabel

local actions = create("Frame", {
    LayoutOrder = 7,
    Size = UDim2.new(1, 0, 0, 72),
    BackgroundTransparency = 1,
}, root) :: Frame
local grid = create("UIGridLayout", {
    CellPadding = UDim2.fromOffset(6, 6),
    CellSize = UDim2.new(0.5, -3, 0, 32),
    FillDirectionMaxCells = 2,
    SortOrder = Enum.SortOrder.LayoutOrder,
}, actions) :: UIGridLayout

local function actionButton(text: string, order: number, color: Color3): TextButton
    local button = create("TextButton", {
        LayoutOrder = order,
        BackgroundColor3 = color,
        BorderSizePixel = 0,
        Text = text,
        TextColor3 = Color3.new(1, 1, 1),
        TextSize = 12,
        Font = Enum.Font.GothamSemibold,
        AutoButtonColor = true,
    }, actions) :: TextButton
    create("UICorner", { CornerRadius = UDim.new(0, 7) }, button)
    return button
end

local stopButton = actionButton("Stop", 1, Color3.fromRGB(220, 38, 38))
local retryButton = actionButton("Retry", 2, Color3.fromRGB(37, 99, 235))
local cancelButton = actionButton("Cancel", 3, Color3.fromRGB(120, 53, 15))
local rollbackButton = actionButton("Rollback", 4, Color3.fromRGB(109, 40, 217))

local secondaryActions = create("Frame", {
    LayoutOrder = 8,
    Size = UDim2.new(1, 0, 0, 72),
    BackgroundTransparency = 1,
}, root) :: Frame
create("UIGridLayout", {
    CellPadding = UDim2.fromOffset(6, 6),
    CellSize = UDim2.new(0.5, -3, 0, 32),
    FillDirectionMaxCells = 2,
    SortOrder = Enum.SortOrder.LayoutOrder,
}, secondaryActions)

local function secondaryButton(text: string, order: number): TextButton
    local button = create("TextButton", {
        LayoutOrder = order,
        BackgroundColor3 = Color3.fromRGB(55, 55, 66),
        BorderSizePixel = 0,
        Text = text,
        TextColor3 = Color3.fromRGB(232, 232, 236),
        TextSize = 12,
        Font = Enum.Font.GothamSemibold,
        AutoButtonColor = true,
    }, secondaryActions) :: TextButton
    create("UICorner", { CornerRadius = UDim.new(0, 7) }, button)
    return button
end

local probeButton = secondaryButton("Probe providers", 1)
local scanButton = secondaryButton("Scan project", 2)
local releaseButton = secondaryButton("Release Manager", 3)
local refreshButton = secondaryButton("Refresh", 4)

local helpLabel = label(
    "Requires start_with_panel.bat and Studio HTTP Requests. The API binds only to 127.0.0.1 and requires the token generated beside control_api.py.",
    56,
    9,
    false
)
helpLabel.TextColor3 = Color3.fromRGB(160, 160, 172)
helpLabel.TextSize = 11

local requestBusy = false
local alive = true

local function baseUrl(): string
    local value = urlBox.Text:gsub("/+$", "")
    if value == "" then
        value = DEFAULT_URL
    end
    return value
end

local function token(): string
    return tokenBox.Text:gsub("^%s+", ""):gsub("%s+$", "")
end

local function request(method: string, path: string, body: any?): (boolean, any)
    local headers = {
        ["Content-Type"] = "application/json",
        ["X-ZeroScript-Token"] = token(),
    }
    local options = {
        Url = baseUrl() .. path,
        Method = method,
        Headers = headers,
    }
    if body ~= nil then
        options.Body = HttpService:JSONEncode(body)
    end
    local ok, result = pcall(function()
        return HttpService:RequestAsync(options)
    end)
    if not ok then
        return false, tostring(result)
    end
    if not result.Success then
        return false, string.format("HTTP %d: %s", result.StatusCode, tostring(result.Body))
    end
    local decodedOk, decoded = pcall(function()
        return HttpService:JSONDecode(result.Body)
    end)
    if not decodedOk then
        return false, "Control API returned invalid JSON"
    end
    return true, decoded
end

local function formatStatus(status: any): string
    local runtime = status.runtime or {}
    local task = status.task
    local bridge = status.bridge or {}
    local risk = status.risk or {}
    local release = status.release
    local lines = {
        "STATE: " .. string.upper(tostring(runtime.state or "unknown")),
    }
    if task then
        table.insert(lines, "Task: " .. tostring(task.id or "?"))
        table.insert(lines, "Phase: " .. tostring(task.phase or "?") .. " / " .. tostring(task.provider or "waiting"))
        if task.round and task.round > 0 then
            table.insert(lines, "Repair round: " .. tostring(task.round))
        end
        if task.error and task.error ~= "" then
            table.insert(lines, "Status: " .. tostring(task.error))
        elseif runtime.detail and runtime.detail ~= "" then
            table.insert(lines, tostring(runtime.detail))
        end
    else
        table.insert(lines, tostring(runtime.detail or "No active task"))
    end
    table.insert(lines, string.format("Bridge: %s · Studio: %s · Tools: %s", bridge.connected and "online" or "offline", bridge.studioConnected == false and "offline" or "ready/unknown", tostring(bridge.tools or 0)))
    if risk.checkedAt then
        table.insert(lines, string.format("Risk: %s/100 %s", tostring(risk.score or 0), string.upper(tostring(risk.level or "low"))))
    end
    if release and release.checkedAt then
        table.insert(lines, "Release readiness: " .. tostring(release.score or 0) .. "%")
    end
    if status.approvals and status.approvals > 0 then
        table.insert(lines, "Pending approvals: " .. tostring(status.approvals))
    end
    return table.concat(lines, "\n")
end

local function refresh()
    if requestBusy or not widget.Enabled then
        return
    end
    requestBusy = true
    local ok, result = request("GET", "/status", nil)
    if ok and result.ok and result.status then
        connectionLabel.Text = "Control API: connected"
        connectionLabel.TextColor3 = Color3.fromRGB(52, 211, 153)
        runtimeText.Text = formatStatus(result.status)
    else
        connectionLabel.Text = "Control API: disconnected"
        connectionLabel.TextColor3 = Color3.fromRGB(251, 191, 36)
        runtimeText.Text = tostring(result) .. "\nEnable HTTP Requests in Game Settings > Security and verify the token."
    end
    requestBusy = false
end

local function sendAction(action: string)
    if requestBusy then
        return
    end
    requestBusy = true
    local ok, result = request("POST", "/action", { action = action })
    requestBusy = false
    if ok then
        connectionLabel.Text = "Queued action: " .. action
        connectionLabel.TextColor3 = Color3.fromRGB(129, 140, 248)
        task.delay(0.5, refresh)
    else
        connectionLabel.Text = "Action failed"
        connectionLabel.TextColor3 = Color3.fromRGB(248, 113, 113)
        runtimeText.Text = tostring(result)
    end
end

saveButton.Activated:Connect(function()
    plugin:SetSetting(SETTINGS_URL, baseUrl())
    plugin:SetSetting(SETTINGS_TOKEN, token())
    connectionLabel.Text = "Settings saved"
    task.delay(0.2, refresh)
end)
stopButton.Activated:Connect(function() sendAction("stop") end)
retryButton.Activated:Connect(function() sendAction("retry") end)
cancelButton.Activated:Connect(function() sendAction("cancel") end)
rollbackButton.Activated:Connect(function() sendAction("rollback") end)
probeButton.Activated:Connect(function() sendAction("probe_providers") end)
scanButton.Activated:Connect(function() sendAction("scan_project") end)
releaseButton.Activated:Connect(function() sendAction("release_manager") end)
refreshButton.Activated:Connect(refresh)

toggleButton.Click:Connect(function()
    widget.Enabled = not widget.Enabled
    if widget.Enabled then
        refresh()
    end
end)

widget:GetPropertyChangedSignal("Enabled"):Connect(function()
    toggleButton:SetActive(widget.Enabled)
    if widget.Enabled then
        refresh()
    end
end)

plugin.Unloading:Connect(function()
    alive = false
end)

task.spawn(function()
    while alive do
        if widget.Enabled then
            refresh()
        end
        task.wait(2)
    end
end)
