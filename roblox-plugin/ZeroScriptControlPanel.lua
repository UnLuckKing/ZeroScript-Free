--!strict
-- ZeroScript One Studio Workspace v1.33.0

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")

local DEFAULT_URL = "http://127.0.0.1:17614"
local SETTINGS_URL = "ZeroScriptControlUrl"
local SETTINGS_TOKEN = "ZeroScriptControlToken"

local toolbar = plugin:CreateToolbar("ZeroScript")
local toggleButton = toolbar:CreateButton("ZeroScriptOne", "Open ZeroScript One", "rbxassetid://4458901886", "ZeroScript One")
toggleButton.ClickableWhenViewportHidden = true

local info = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 430, 620, 360, 460)
local widget = plugin:CreateDockWidgetPluginGui("ZeroScriptOneV133", info)
widget.Title = "ZeroScript One"
widget.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

local function make(className: string, props: {[string]: any}, parent: Instance?): Instance
    local object = Instance.new(className)
    for key, value in pairs(props) do
        (object :: any)[key] = value
    end
    if parent then object.Parent = parent end
    return object
end

local function round(parent: Instance, radius: number)
    make("UICorner", {CornerRadius = UDim.new(0, radius)}, parent)
end

local root = make("Frame", {Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(10,13,20),BorderSizePixel=0}, widget) :: Frame
make("UIPadding", {PaddingTop=UDim.new(0,14),PaddingBottom=UDim.new(0,14),PaddingLeft=UDim.new(0,14),PaddingRight=UDim.new(0,14)}, root)
make("UIListLayout", {Padding=UDim.new(0,10),SortOrder=Enum.SortOrder.LayoutOrder}, root)

local hero = make("Frame", {LayoutOrder=1,Size=UDim2.new(1,0,0,68),BackgroundColor3=Color3.fromRGB(22,28,42),BorderSizePixel=0}, root) :: Frame
round(hero, 12)
make("UIPadding", {PaddingTop=UDim.new(0,12),PaddingBottom=UDim.new(0,12),PaddingLeft=UDim.new(0,14),PaddingRight=UDim.new(0,14)}, hero)
local title = make("TextLabel", {Size=UDim2.new(1,-90,0,24),BackgroundTransparency=1,Text="ZeroScript One",TextColor3=Color3.fromRGB(247,248,252),TextSize=18,Font=Enum.Font.GothamBold,TextXAlignment=Enum.TextXAlignment.Left}, hero) :: TextLabel
local subtitle = make("TextLabel", {Position=UDim2.fromOffset(0,28),Size=UDim2.new(1,-80,0,20),BackgroundTransparency=1,Text="Tek istek · tek AI · tek geçiş",TextColor3=Color3.fromRGB(154,166,188),TextSize=11,Font=Enum.Font.Gotham,TextXAlignment=Enum.TextXAlignment.Left}, hero) :: TextLabel
local statusPill = make("TextLabel", {AnchorPoint=Vector2.new(1,.5),Position=UDim2.new(1,0,.5,0),Size=UDim2.fromOffset(82,30),BackgroundColor3=Color3.fromRGB(42,35,74),Text="BAĞLANIYOR",TextColor3=Color3.fromRGB(209,198,255),TextSize=10,Font=Enum.Font.GothamBold}, hero) :: TextLabel
round(statusPill, 9)

local connection = make("Frame", {LayoutOrder=2,Size=UDim2.new(1,0,0,54),BackgroundColor3=Color3.fromRGB(18,23,35),BorderSizePixel=0}, root) :: Frame
round(connection, 10)
make("UIPadding", {PaddingTop=UDim.new(0,9),PaddingBottom=UDim.new(0,9),PaddingLeft=UDim.new(0,12),PaddingRight=UDim.new(0,12)}, connection)
local connectionText = make("TextLabel", {Size=UDim2.new(1,-100,1,0),BackgroundTransparency=1,Text="Hub aranıyor…",TextColor3=Color3.fromRGB(202,211,225),TextSize=12,Font=Enum.Font.Gotham,TextXAlignment=Enum.TextXAlignment.Left,TextWrapped=true}, connection) :: TextLabel
local connectButton = make("TextButton", {AnchorPoint=Vector2.new(1,.5),Position=UDim2.new(1,0,.5,0),Size=UDim2.fromOffset(92,34),BackgroundColor3=Color3.fromRGB(124,92,252),BorderSizePixel=0,Text="Bağlan",TextColor3=Color3.new(1,1,1),TextSize=12,Font=Enum.Font.GothamSemibold}, connection) :: TextButton
round(connectButton, 9)

local promptCard = make("Frame", {LayoutOrder=3,Size=UDim2.new(1,0,0,196),BackgroundColor3=Color3.fromRGB(18,23,35),BorderSizePixel=0}, root) :: Frame
round(promptCard, 12)
make("UIPadding", {PaddingTop=UDim.new(0,12),PaddingBottom=UDim.new(0,12),PaddingLeft=UDim.new(0,12),PaddingRight=UDim.new(0,12)}, promptCard)
local promptLabel = make("TextLabel", {Size=UDim2.new(1,0,0,20),BackgroundTransparency=1,Text="Oyunda ne yapayım?",TextColor3=Color3.fromRGB(247,248,252),TextSize=13,Font=Enum.Font.GothamSemibold,TextXAlignment=Enum.TextXAlignment.Left}, promptCard) :: TextLabel
local prompt = make("TextBox", {Position=UDim2.fromOffset(0,28),Size=UDim2.new(1,0,0,112),BackgroundColor3=Color3.fromRGB(24,31,47),BorderSizePixel=0,Text="",PlaceholderText="Örn: Seçili shop UI'yi profesyonelleştir, bütün butonları çalıştır ve test et.",PlaceholderColor3=Color3.fromRGB(112,126,151),TextColor3=Color3.fromRGB(247,248,252),TextSize=12,Font=Enum.Font.Gotham,TextWrapped=true,MultiLine=true,ClearTextOnFocus=false,TextXAlignment=Enum.TextXAlignment.Left,TextYAlignment=Enum.TextYAlignment.Top}, promptCard) :: TextBox
round(prompt, 10)
make("UIPadding", {PaddingTop=UDim.new(0,10),PaddingBottom=UDim.new(0,10),PaddingLeft=UDim.new(0,10),PaddingRight=UDim.new(0,10)}, prompt)
local selectionText = make("TextLabel", {Position=UDim2.fromOffset(0,148),Size=UDim2.new(1,0,0,24),BackgroundTransparency=1,Text="Seçim: yok",TextColor3=Color3.fromRGB(140,153,176),TextSize=10,Font=Enum.Font.Code,TextXAlignment=Enum.TextXAlignment.Left,TextTruncate=Enum.TextTruncate.AtEnd}, promptCard) :: TextLabel

local actions = make("Frame", {LayoutOrder=4,Size=UDim2.new(1,0,0,42),BackgroundTransparency=1}, root) :: Frame
make("UIListLayout", {FillDirection=Enum.FillDirection.Horizontal,Padding=UDim.new(0,7),SortOrder=Enum.SortOrder.LayoutOrder}, actions)
local function button(text: string, width: number, color: Color3): TextButton
    local item = make("TextButton", {Size=UDim2.new(0,width,1,0),BackgroundColor3=color,BorderSizePixel=0,Text=text,TextColor3=Color3.new(1,1,1),TextSize=12,Font=Enum.Font.GothamSemibold}, actions) :: TextButton
    round(item, 9)
    return item
end
local buildButton = button("Yap", 150, Color3.fromRGB(124,92,252))
local stopButton = button("Durdur", 82, Color3.fromRGB(72,35,48))
local rollbackButton = button("Geri al", 82, Color3.fromRGB(48,56,76))

local quick = make("Frame", {LayoutOrder=5,Size=UDim2.new(1,0,0,38),BackgroundTransparency=1}, root) :: Frame
make("UIListLayout", {FillDirection=Enum.FillDirection.Horizontal,Padding=UDim.new(0,7),SortOrder=Enum.SortOrder.LayoutOrder}, quick)
local fixButton = button("Son hatayı düzelt", 138, Color3.fromRGB(35,76,68)); fixButton.Parent = quick
local scanButton = button("Projeyi tara", 112, Color3.fromRGB(42,54,78)); scanButton.Parent = quick

local activityCard = make("Frame", {LayoutOrder=6,Size=UDim2.new(1,0,0,170),BackgroundColor3=Color3.fromRGB(18,23,35),BorderSizePixel=0}, root) :: Frame
round(activityCard, 12)
make("UIPadding", {PaddingTop=UDim.new(0,12),PaddingBottom=UDim.new(0,12),PaddingLeft=UDim.new(0,12),PaddingRight=UDim.new(0,12)}, activityCard)
local activityTitle = make("TextLabel", {Size=UDim2.new(1,0,0,20),BackgroundTransparency=1,Text="Canlı ilerleme",TextColor3=Color3.fromRGB(247,248,252),TextSize=13,Font=Enum.Font.GothamSemibold,TextXAlignment=Enum.TextXAlignment.Left}, activityCard) :: TextLabel
local activityText = make("TextLabel", {Position=UDim2.fromOffset(0,28),Size=UDim2.new(1,0,1,-28),BackgroundTransparency=1,Text="Henüz aktif iş yok.",TextColor3=Color3.fromRGB(166,178,198),TextSize=11,Font=Enum.Font.Code,TextXAlignment=Enum.TextXAlignment.Left,TextYAlignment=Enum.TextYAlignment.Top,TextWrapped=true}, activityCard) :: TextLabel

local baseUrl = tostring(plugin:GetSetting(SETTINGS_URL) or DEFAULT_URL):gsub("/+$", "")
local authToken = tostring(plugin:GetSetting(SETTINGS_TOKEN) or "")
local requestBusy = false
local alive = true

local function request(method: string, path: string, body: any?, useToken: boolean?): (boolean, any)
    local headers = { ["Content-Type"] = "application/json" }
    if useToken ~= false and authToken ~= "" then headers["X-ZeroScript-Token"] = authToken end
    local options: any = {Url=baseUrl .. path,Method=method,Headers=headers}
    if body ~= nil then options.Body = HttpService:JSONEncode(body) end
    local ok, result = pcall(function() return HttpService:RequestAsync(options) end)
    if not ok then return false, tostring(result) end
    if not result.Success then return false, string.format("HTTP %d", result.StatusCode) end
    local decodedOk, decoded = pcall(function() return HttpService:JSONDecode(result.Body) end)
    if not decodedOk then return false, "Invalid JSON" end
    return true, decoded
end

local function pair(): boolean
    local ok, result = request("GET", "/pair", nil, false)
    if ok and result and result.token then
        authToken = tostring(result.token)
        baseUrl = tostring(result.url or DEFAULT_URL):gsub("/+$", "")
        plugin:SetSetting(SETTINGS_TOKEN, authToken)
        plugin:SetSetting(SETTINGS_URL, baseUrl)
        connectionText.Text = "Hub bağlandı · Studio hazır"
        statusPill.Text = "HAZIR"
        statusPill.BackgroundColor3 = Color3.fromRGB(23,68,59)
        return true
    end
    connectionText.Text = "Hub açıkken Bağlan'a bas. Eşleştirme penceresi otomatik açılır."
    statusPill.Text = "BEKLİYOR"
    return false
end

local function selectedPaths(): {string}
    local values = {}
    for _, instance in Selection:Get() do
        if #values >= 20 then break end
        local parts = {}
        local current: Instance? = instance
        while current and current ~= game do table.insert(parts,1,current.Name); current=current.Parent end
        table.insert(values, table.concat(parts,"."))
    end
    return values
end

local function updateSelection()
    local paths = selectedPaths()
    selectionText.Text = #paths > 0 and ("Seçim: " .. table.concat(paths, ", ")) or "Seçim: yok"
end

local function action(name: string, payload: any?)
    if authToken == "" and not pair() then return end
    task.spawn(function()
        local ok, result = request("POST", "/action", {action=name,payload=payload or {}}, true)
        if not ok then connectionText.Text = "Komut gönderilemedi: " .. tostring(result); statusPill.Text = "HATA" end
    end)
end

local function render(status: any)
    local workbench = status.workbench or {}
    local bridge = status.bridge or {}
    local connected = status.extensionConnected == true
    local studio = bridge.studioConnected == true
    connectionText.Text = string.format("Extension: %s · Studio: %s", connected and "hazır" or "bekliyor", studio and "bağlı" or "bekliyor")
    statusPill.Text = connected and studio and "HAZIR" or "BEKLİYOR"
    statusPill.BackgroundColor3 = connected and studio and Color3.fromRGB(23,68,59) or Color3.fromRGB(62,48,24)
    local lines = {}
    for _, item in workbench.activity or {} do
        local symbol = item.kind == "done" and "✓" or item.kind == "error" and "!" or item.kind == "active" and "●" or "•"
        table.insert(lines, symbol .. " " .. tostring(item.text or ""))
        if item.detail and item.detail ~= "" then table.insert(lines, "   " .. tostring(item.detail)) end
    end
    activityText.Text = #lines > 0 and table.concat(lines,"\n") or "Henüz aktif iş yok."
end

local function refresh()
    if requestBusy or not widget.Enabled or authToken == "" then return end
    requestBusy = true
    task.spawn(function()
        local ok, result = request("GET", "/status", nil, true)
        if ok and result and result.status then render(result.status) end
        requestBusy = false
    end)
end

connectButton.Activated:Connect(function() pair(); refresh() end)
buildButton.Activated:Connect(function()
    local goal = prompt.Text:gsub("^%s+",""):gsub("%s+$","")
    if goal == "" then connectionText.Text = "Önce ne yapılacağını yaz." return end
    action("workbench_start", {goal=goal,source="studio",selectionPaths=selectedPaths()})
end)
stopButton.Activated:Connect(function() action("workbench_stop") end)
rollbackButton.Activated:Connect(function() action("rollback") end)
fixButton.Activated:Connect(function() action("workbench_fix_output", {source="studio"}) end)
scanButton.Activated:Connect(function() action("scan_project") end)
Selection.SelectionChanged:Connect(updateSelection)

toggleButton.Click:Connect(function() widget.Enabled = not widget.Enabled end)
widget:GetPropertyChangedSignal("Enabled"):Connect(function() toggleButton:SetActive(widget.Enabled); if widget.Enabled then pair(); refresh() end end)

updateSelection()
task.spawn(function()
    for _ = 1, 18 do
        if pair() then break end
        task.wait(1)
    end
end)
task.spawn(function()
    while alive do task.wait(1.2); refresh() end
end)
plugin.Unloading:Connect(function() alive = false end)
