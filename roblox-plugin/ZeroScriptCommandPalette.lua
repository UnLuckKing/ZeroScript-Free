--!strict
-- ZeroScript Studio Command Palette v1.30.0
-- The PluginAction is bindable from Studio > Customize Shortcuts (recommended Ctrl+K).

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")

local DEFAULT_URL = "http://127.0.0.1:17614"
local SETTINGS_URL = "ZeroScriptControlUrl"
local SETTINGS_TOKEN = "ZeroScriptControlToken"

local toolbar = plugin:CreateToolbar("ZeroScript")
local button = toolbar:CreateButton(
    "ZeroScriptPalette",
    "Open the ZeroScript command palette",
    "rbxassetid://4458901886",
    "Command Palette"
)
button.ClickableWhenViewportHidden = true

local action = plugin:CreatePluginAction(
    "ZeroScriptCommandPaletteActionV130",
    "ZeroScript: Command Palette",
    "Open ZeroScript Command Palette. Bind this action to Ctrl+K in Customize Shortcuts.",
    "rbxassetid://4458901886",
    true
)

local info = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Float, false, false, 520, 310, 420, 260)
local widget = plugin:CreateDockWidgetPluginGui("ZeroScriptCommandPaletteV130", info)
widget.Title = "ZeroScript Command Palette"
widget.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

local function make(className: string, properties: {[string]: any}, parent: Instance?): Instance
    local instance = Instance.new(className)
    for key, value in pairs(properties) do
        (instance :: any)[key] = value
    end
    if parent then instance.Parent = parent end
    return instance
end

local root = make("Frame", {
    Size = UDim2.fromScale(1, 1), BackgroundColor3 = Color3.fromRGB(11, 13, 18), BorderSizePixel = 0,
}, widget) :: Frame
make("UIPadding", {PaddingTop=UDim.new(0,16),PaddingBottom=UDim.new(0,16),PaddingLeft=UDim.new(0,16),PaddingRight=UDim.new(0,16)}, root)
make("UIListLayout", {Padding=UDim.new(0,9),SortOrder=Enum.SortOrder.LayoutOrder}, root)

local title = make("TextLabel", {
    LayoutOrder=1, Size=UDim2.new(1,0,0,28), BackgroundTransparency=1, Text="ZeroScript Command Palette",
    TextColor3=Color3.fromRGB(244,247,251), TextSize=18, Font=Enum.Font.GothamBold,
    TextXAlignment=Enum.TextXAlignment.Left,
}, root) :: TextLabel

local hint = make("TextLabel", {
    LayoutOrder=2, Size=UDim2.new(1,0,0,34), BackgroundTransparency=1,
    Text="Write what should happen. Selected Explorer instances are attached automatically. Bind the action to Ctrl+K in Customize Shortcuts.",
    TextColor3=Color3.fromRGB(154,165,182), TextSize=11, Font=Enum.Font.Gotham,
    TextXAlignment=Enum.TextXAlignment.Left, TextWrapped=true,
}, root) :: TextLabel

local selectionLabel = make("TextLabel", {
    LayoutOrder=3, Size=UDim2.new(1,0,0,22), BackgroundColor3=Color3.fromRGB(25,30,43), BorderSizePixel=0,
    Text="Selection: none", TextColor3=Color3.fromRGB(201,189,255), TextSize=11, Font=Enum.Font.Code,
    TextXAlignment=Enum.TextXAlignment.Left,
}, root) :: TextLabel
make("UICorner", {CornerRadius=UDim.new(0,7)}, selectionLabel)
make("UIPadding", {PaddingLeft=UDim.new(0,8),PaddingRight=UDim.new(0,8)}, selectionLabel)

local box = make("TextBox", {
    LayoutOrder=4, Size=UDim2.new(1,0,0,92), BackgroundColor3=Color3.fromRGB(25,30,43), BorderSizePixel=0,
    Text="", PlaceholderText="Example: Make this selected shop button open reliably on desktop and mobile, then test it.",
    PlaceholderColor3=Color3.fromRGB(110,122,144), TextColor3=Color3.fromRGB(244,247,251),
    TextSize=13, Font=Enum.Font.Gotham, TextWrapped=true, MultiLine=true, ClearTextOnFocus=false,
    TextXAlignment=Enum.TextXAlignment.Left, TextYAlignment=Enum.TextYAlignment.Top,
}, root) :: TextBox
make("UICorner", {CornerRadius=UDim.new(0,10)}, box)
make("UIPadding", {PaddingTop=UDim.new(0,9),PaddingBottom=UDim.new(0,9),PaddingLeft=UDim.new(0,10),PaddingRight=UDim.new(0,10)}, box)

local actions = make("Frame", {LayoutOrder=5,Size=UDim2.new(1,0,0,38),BackgroundTransparency=1}, root) :: Frame
make("UIListLayout", {FillDirection=Enum.FillDirection.Horizontal,Padding=UDim.new(0,7),SortOrder=Enum.SortOrder.LayoutOrder}, actions)

local function commandButton(text: string, color: Color3): TextButton
    local item = make("TextButton", {
        Size=UDim2.new(0,0,1,0), AutomaticSize=Enum.AutomaticSize.X, BackgroundColor3=color, BorderSizePixel=0,
        Text=text, TextColor3=Color3.new(1,1,1), TextSize=12, Font=Enum.Font.GothamSemibold, AutoButtonColor=true,
    }, actions) :: TextButton
    make("UICorner", {CornerRadius=UDim.new(0,8)}, item)
    make("UIPadding", {PaddingLeft=UDim.new(0,13),PaddingRight=UDim.new(0,13)}, item)
    return item
end

local runButton = commandButton("Run with ZeroScript", Color3.fromRGB(124,92,252))
local genomeButton = commandButton("Scan Genome", Color3.fromRGB(45,108,132))
local proofButton = commandButton("Evaluate Proof", Color3.fromRGB(35,108,86))
local healButton = commandButton("Self-Heal", Color3.fromRGB(116,73,35))

local status = make("TextLabel", {
    LayoutOrder=6, Size=UDim2.new(1,0,0,24), BackgroundTransparency=1, Text="Ready",
    TextColor3=Color3.fromRGB(154,165,182), TextSize=11, Font=Enum.Font.Gotham,
    TextXAlignment=Enum.TextXAlignment.Left,
}, root) :: TextLabel

local function baseUrl(): string
    local value = tostring(plugin:GetSetting(SETTINGS_URL) or DEFAULT_URL):gsub("/+$", "")
    return value ~= "" and value or DEFAULT_URL
end

local function token(): string
    return tostring(plugin:GetSetting(SETTINGS_TOKEN) or ""):gsub("^%s+", ""):gsub("%s+$", "")
end

local function pathOf(instance: Instance): string
    local parts = {}
    local current: Instance? = instance
    while current and current ~= game do
        table.insert(parts, 1, current.Name)
        current = current.Parent
    end
    return table.concat(parts, ".")
end

local function selectedPaths(): {string}
    local paths = {}
    for _, instance in Selection:Get() do
        if #paths >= 20 then break end
        table.insert(paths, pathOf(instance))
    end
    return paths
end

local function updateSelection()
    local paths = selectedPaths()
    selectionLabel.Text = #paths > 0 and ("Selection: " .. table.concat(paths, ", ")) or "Selection: none"
end

local function postAction(actionName: string, payload: any?)
    if token() == "" then
        status.Text = "Open ZeroScript Control Center and save the connection token first."
        status.TextColor3 = Color3.fromRGB(240,98,118)
        return
    end
    status.Text = "Sending " .. actionName .. "…"
    status.TextColor3 = Color3.fromRGB(246,184,74)
    task.spawn(function()
        local ok, response = pcall(function()
            return HttpService:RequestAsync({
                Url = baseUrl() .. "/action",
                Method = "POST",
                Headers = { ["Content-Type"]="application/json", ["X-ZeroScript-Token"]=token() },
                Body = HttpService:JSONEncode({action=actionName,payload=payload or {}}),
            })
        end)
        if ok and response.Success then
            status.Text = "Queued: " .. actionName
            status.TextColor3 = Color3.fromRGB(45,212,163)
        else
            status.Text = ok and ("HTTP " .. tostring(response.StatusCode) .. ": " .. tostring(response.Body)) or tostring(response)
            status.TextColor3 = Color3.fromRGB(240,98,118)
        end
    end)
end

runButton.Activated:Connect(function()
    local goal = box.Text:gsub("^%s+", ""):gsub("%s+$", "")
    if goal == "" then
        status.Text = "Write a command first."
        return
    end
    postAction("studio_command", {goal=goal,selectionPaths=selectedPaths()})
end)
genomeButton.Activated:Connect(function() postAction("genome_scan") end)
proofButton.Activated:Connect(function() postAction("proof_evaluate") end)
healButton.Activated:Connect(function() postAction("self_heal_scan") end)
Selection.SelectionChanged:Connect(updateSelection)

local function openPalette()
    widget.Enabled = true
    updateSelection()
    task.defer(function() box:CaptureFocus() end)
end

button.Click:Connect(openPalette)
action.Triggered:Connect(openPalette)
widget:GetPropertyChangedSignal("Enabled"):Connect(function() button:SetActive(widget.Enabled) end)
updateSelection()
