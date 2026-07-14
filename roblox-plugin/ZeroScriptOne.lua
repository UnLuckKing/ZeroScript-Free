--!strict
-- ZeroScript One 1.34 Studio workspace.

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")

local BASE_URL = "http://127.0.0.1:17614"
local TOKEN_SETTING = "ZeroScriptControlToken"
local URL_SETTING = "ZeroScriptControlUrl"

local toolbar = plugin:CreateToolbar("ZeroScript One")
local openButton = toolbar:CreateButton("ZeroScriptOne134", "Open ZeroScript One", "rbxassetid://4458901886", "ZeroScript One")
openButton.ClickableWhenViewportHidden = true

local info = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Right, false, false, 430, 560, 360, 430)
local widget = plugin:CreateDockWidgetPluginGui("ZeroScriptOneWorkspace134", info)
widget.Title = "ZeroScript One"
widget.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

local function create(className: string, props: {[string]: any}, parent: Instance?): Instance
    local item = Instance.new(className)
    for key, value in pairs(props) do (item :: any)[key] = value end
    if parent then item.Parent = parent end
    return item
end

local root = create("Frame", {Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(10,13,21),BorderSizePixel=0}, widget) :: Frame
create("UIPadding", {PaddingTop=UDim.new(0,14),PaddingBottom=UDim.new(0,14),PaddingLeft=UDim.new(0,14),PaddingRight=UDim.new(0,14)}, root)
create("UIListLayout", {Padding=UDim.new(0,9),SortOrder=Enum.SortOrder.LayoutOrder}, root)

create("TextLabel", {LayoutOrder=1,Size=UDim2.new(1,0,0,30),BackgroundTransparency=1,Text="ZeroScript One",TextColor3=Color3.fromRGB(245,247,255),TextSize=21,Font=Enum.Font.GothamBold,TextXAlignment=Enum.TextXAlignment.Left}, root)
create("TextLabel", {LayoutOrder=2,Size=UDim2.new(1,0,0,34),BackgroundTransparency=1,Text="Golden Template ile hızlı prototip veya tek AI ile özel geliştirme.",TextColor3=Color3.fromRGB(151,163,190),TextSize=11,Font=Enum.Font.Gotham,TextWrapped=true,TextXAlignment=Enum.TextXAlignment.Left}, root)

local connection = create("TextLabel", {LayoutOrder=3,Size=UDim2.new(1,0,0,30),BackgroundColor3=Color3.fromRGB(22,28,45),BorderSizePixel=0,Text="● Hub eşleştiriliyor",TextColor3=Color3.fromRGB(246,184,74),TextSize=12,Font=Enum.Font.GothamSemibold,TextXAlignment=Enum.TextXAlignment.Left}, root) :: TextLabel
create("UICorner", {CornerRadius=UDim.new(0,9)}, connection)
create("UIPadding", {PaddingLeft=UDim.new(0,10),PaddingRight=UDim.new(0,10)}, connection)

local selectionLabel = create("TextLabel", {LayoutOrder=4,Size=UDim2.new(1,0,0,40),BackgroundColor3=Color3.fromRGB(17,22,36),BorderSizePixel=0,Text="Seçim: yok",TextColor3=Color3.fromRGB(194,184,255),TextSize=10,Font=Enum.Font.Code,TextWrapped=true,TextXAlignment=Enum.TextXAlignment.Left}, root) :: TextLabel
create("UICorner", {CornerRadius=UDim.new(0,8)}, selectionLabel)
create("UIPadding", {PaddingLeft=UDim.new(0,9),PaddingRight=UDim.new(0,9)}, selectionLabel)

local prompt = create("TextBox", {LayoutOrder=5,Size=UDim2.new(1,0,0,160),BackgroundColor3=Color3.fromRGB(19,25,41),BorderSizePixel=0,Text="",PlaceholderText="Örnek: Celestial temalı profesyonel aura RNG prototipi yap.",PlaceholderColor3=Color3.fromRGB(102,115,142),TextColor3=Color3.fromRGB(245,247,255),TextSize=13,Font=Enum.Font.Gotham,TextWrapped=true,MultiLine=true,ClearTextOnFocus=false,TextXAlignment=Enum.TextXAlignment.Left,TextYAlignment=Enum.TextYAlignment.Top}, root) :: TextBox
create("UICorner", {CornerRadius=UDim.new(0,12)}, prompt)
create("UIStroke", {Color=Color3.fromRGB(53,64,91),Thickness=1}, prompt)
create("UIPadding", {PaddingTop=UDim.new(0,10),PaddingBottom=UDim.new(0,10),PaddingLeft=UDim.new(0,11),PaddingRight=UDim.new(0,11)}, prompt)

local modes = create("Frame", {LayoutOrder=6,Size=UDim2.new(1,0,0,88),BackgroundTransparency=1}, root) :: Frame
create("UIListLayout", {FillDirection=Enum.FillDirection.Horizontal,Padding=UDim.new(0,7),SortOrder=Enum.SortOrder.LayoutOrder}, modes)

local function modeButton(text: string, color: Color3): TextButton
    local button = create("TextButton", {Size=UDim2.new(0.333,-5,1,0),BackgroundColor3=color,BorderSizePixel=0,Text=text,TextColor3=Color3.new(1,1,1),TextSize=12,Font=Enum.Font.GothamBold,TextWrapped=true}, modes) :: TextButton
    create("UICorner", {CornerRadius=UDim.new(0,10)}, button)
    return button
end

local prototypeButton = modeButton("⚡ 15 dk\nPrototip", Color3.fromRGB(118,86,255))
local launchButton = modeButton("🚀 1 Günlük\nYayın", Color3.fromRGB(38,126,110))
local customButton = modeButton("✦ Özel\nİş", Color3.fromRGB(42,53,80))

local actions = create("Frame", {LayoutOrder=7,Size=UDim2.new(1,0,0,42),BackgroundTransparency=1}, root) :: Frame
create("UIListLayout", {FillDirection=Enum.FillDirection.Horizontal,Padding=UDim.new(0,7),SortOrder=Enum.SortOrder.LayoutOrder}, actions)
local stopButton = create("TextButton", {Size=UDim2.new(0.5,-4,1,0),BackgroundColor3=Color3.fromRGB(70,34,46),BorderSizePixel=0,Text="Durdur",TextColor3=Color3.fromRGB(255,154,170),TextSize=12,Font=Enum.Font.GothamBold}, actions) :: TextButton
local rollbackButton = create("TextButton", {Size=UDim2.new(0.5,-4,1,0),BackgroundColor3=Color3.fromRGB(34,43,65),BorderSizePixel=0,Text="Son değişikliği geri al",TextColor3=Color3.fromRGB(224,230,245),TextSize=12,Font=Enum.Font.GothamBold}, actions) :: TextButton
create("UICorner", {CornerRadius=UDim.new(0,9)}, stopButton) create("UICorner", {CornerRadius=UDim.new(0,9)}, rollbackButton)

local status = create("TextLabel", {LayoutOrder=8,Size=UDim2.new(1,0,0,74),BackgroundColor3=Color3.fromRGB(17,22,36),BorderSizePixel=0,Text="Hazır",TextColor3=Color3.fromRGB(155,167,193),TextSize=11,Font=Enum.Font.Gotham,TextWrapped=true,TextXAlignment=Enum.TextXAlignment.Left,TextYAlignment=Enum.TextYAlignment.Top}, root) :: TextLabel
create("UICorner", {CornerRadius=UDim.new(0,9)}, status)
create("UIPadding", {PaddingTop=UDim.new(0,9),PaddingBottom=UDim.new(0,9),PaddingLeft=UDim.new(0,10),PaddingRight=UDim.new(0,10)}, status)

local function baseUrl(): string
    return tostring(plugin:GetSetting(URL_SETTING) or BASE_URL):gsub("/+$", "")
end
local function token(): string
    return tostring(plugin:GetSetting(TOKEN_SETTING) or ""):gsub("^%s+", ""):gsub("%s+$", "")
end
local function pathOf(instance: Instance): string
    local parts = {} local current: Instance? = instance
    while current and current ~= game do table.insert(parts,1,current.Name) current=current.Parent end
    return table.concat(parts,".")
end
local function selectionPaths(): {string}
    local values = {} for _,instance in Selection:Get() do if #values>=20 then break end table.insert(values,pathOf(instance)) end return values
end
local function refreshSelection()
    local values=selectionPaths() selectionLabel.Text=#values>0 and ("Seçim: "..table.concat(values,", ")) or "Seçim: yok"
end
local function pair(): boolean
    if token() ~= "" then return true end
    local ok,response=pcall(function() return HttpService:RequestAsync({Url=baseUrl().."/pair",Method="GET"}) end)
    if ok and response.Success then
        local decoded=HttpService:JSONDecode(response.Body) if decoded.ok and decoded.token then plugin:SetSetting(TOKEN_SETTING,decoded.token) plugin:SetSetting(URL_SETTING,decoded.url or BASE_URL) return true end
    end
    return false
end
local function sendAction(action: string, payload: any?)
    if not pair() then status.Text="Hub eşleştirme penceresi kapalı. ZeroScript One uygulamasını aç." status.TextColor3=Color3.fromRGB(255,120,140) return end
    status.Text="Gönderiliyor: "..action status.TextColor3=Color3.fromRGB(246,184,74)
    task.spawn(function()
        local ok,response=pcall(function() return HttpService:RequestAsync({Url=baseUrl().."/action",Method="POST",Headers={["Content-Type"]="application/json",["X-ZeroScript-Token"]=token()},Body=HttpService:JSONEncode({action=action,payload=payload or {}})}) end)
        if ok and response.Success then status.Text="✓ İş kuyruğa alındı. Canlı durumu ZeroScript One uygulamasından izle." status.TextColor3=Color3.fromRGB(45,212,163)
        else status.Text=ok and ("HTTP "..tostring(response.StatusCode)..": "..tostring(response.Body)) or tostring(response) status.TextColor3=Color3.fromRGB(255,120,140) end
    end)
end
local function goal(): string
    local text=prompt.Text:gsub("^%s+",""):gsub("%s+$","")
    local selected=selectionPaths() if #selected>0 then text=text.."\n\nSTUDIO SELECTION\n- "..table.concat(selected,"\n- ") end
    return text
end
local function start(action: string)
    local text=goal() if text=="" then status.Text="Önce oyun fikrini veya yapılacak işi yaz." return end
    sendAction(action,{goal=text,source="studio"})
end
prototypeButton.Activated:Connect(function() start("prototype_start") end)
launchButton.Activated:Connect(function() start("launch_day_start") end)
customButton.Activated:Connect(function() start("workbench_start") end)
stopButton.Activated:Connect(function() sendAction("workbench_stop") end)
rollbackButton.Activated:Connect(function() sendAction("rollback") end)
Selection.SelectionChanged:Connect(refreshSelection)

local function open()
    widget.Enabled=true refreshSelection() task.defer(function() prompt:CaptureFocus() end)
end
openButton.Click:Connect(open)
widget:GetPropertyChangedSignal("Enabled"):Connect(function() openButton:SetActive(widget.Enabled) end)

task.spawn(function()
    while task.wait(2) do
        if pair() then connection.Text="● ZeroScript One bağlı" connection.TextColor3=Color3.fromRGB(45,212,163)
        else connection.Text="○ ZeroScript One bekleniyor" connection.TextColor3=Color3.fromRGB(246,184,74) end
    end
end)
refreshSelection()
