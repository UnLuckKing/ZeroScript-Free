--!strict
-- ZeroScript One Command Palette v1.33.0

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")

local DEFAULT_URL = "http://127.0.0.1:17614"
local SETTINGS_URL = "ZeroScriptControlUrl"
local SETTINGS_TOKEN = "ZeroScriptControlToken"

local toolbar = plugin:CreateToolbar("ZeroScript")
local button = toolbar:CreateButton("ZeroScriptPalette", "Open ZeroScript One command palette", "rbxassetid://4458901886", "Command Palette")
button.ClickableWhenViewportHidden = true
local action = plugin:CreatePluginAction("ZeroScriptOnePaletteV133", "ZeroScript One: Command Palette", "Open ZeroScript One. Bind to Ctrl+K in Customize Shortcuts.", "rbxassetid://4458901886", true)

local info = DockWidgetPluginGuiInfo.new(Enum.InitialDockState.Float, false, false, 540, 300, 430, 250)
local widget = plugin:CreateDockWidgetPluginGui("ZeroScriptOnePaletteV133", info)
widget.Title = "ZeroScript One"
widget.ZIndexBehavior = Enum.ZIndexBehavior.Sibling

local function make(className: string, props: {[string]: any}, parent: Instance?): Instance
    local object = Instance.new(className)
    for key, value in pairs(props) do (object :: any)[key] = value end
    if parent then object.Parent = parent end
    return object
end

local root = make("Frame", {Size=UDim2.fromScale(1,1),BackgroundColor3=Color3.fromRGB(10,13,20),BorderSizePixel=0}, widget) :: Frame
make("UIPadding", {PaddingTop=UDim.new(0,16),PaddingBottom=UDim.new(0,16),PaddingLeft=UDim.new(0,16),PaddingRight=UDim.new(0,16)}, root)
make("UIListLayout", {Padding=UDim.new(0,9),SortOrder=Enum.SortOrder.LayoutOrder}, root)
make("TextLabel", {LayoutOrder=1,Size=UDim2.new(1,0,0,26),BackgroundTransparency=1,Text="ZeroScript One",TextColor3=Color3.fromRGB(247,248,252),TextSize=18,Font=Enum.Font.GothamBold,TextXAlignment=Enum.TextXAlignment.Left}, root)
local selectionLabel = make("TextLabel", {LayoutOrder=2,Size=UDim2.new(1,0,0,24),BackgroundColor3=Color3.fromRGB(22,28,42),BorderSizePixel=0,Text="Seçim: yok",TextColor3=Color3.fromRGB(199,189,255),TextSize=10,Font=Enum.Font.Code,TextXAlignment=Enum.TextXAlignment.Left,TextTruncate=Enum.TextTruncate.AtEnd}, root) :: TextLabel
make("UICorner", {CornerRadius=UDim.new(0,8)}, selectionLabel)
make("UIPadding", {PaddingLeft=UDim.new(0,9),PaddingRight=UDim.new(0,9)}, selectionLabel)
local box = make("TextBox", {LayoutOrder=3,Size=UDim2.new(1,0,0,110),BackgroundColor3=Color3.fromRGB(22,28,42),BorderSizePixel=0,Text="",PlaceholderText="Ne yapılacağını yaz. Seçili Explorer nesneleri otomatik eklenir.",PlaceholderColor3=Color3.fromRGB(112,126,151),TextColor3=Color3.fromRGB(247,248,252),TextSize=13,Font=Enum.Font.Gotham,TextWrapped=true,MultiLine=true,ClearTextOnFocus=false,TextXAlignment=Enum.TextXAlignment.Left,TextYAlignment=Enum.TextYAlignment.Top}, root) :: TextBox
make("UICorner", {CornerRadius=UDim.new(0,10)}, box)
make("UIPadding", {PaddingTop=UDim.new(0,10),PaddingBottom=UDim.new(0,10),PaddingLeft=UDim.new(0,10),PaddingRight=UDim.new(0,10)}, box)
local run = make("TextButton", {LayoutOrder=4,Size=UDim2.new(1,0,0,40),BackgroundColor3=Color3.fromRGB(124,92,252),BorderSizePixel=0,Text="Yap",TextColor3=Color3.new(1,1,1),TextSize=13,Font=Enum.Font.GothamSemibold}, root) :: TextButton
make("UICorner", {CornerRadius=UDim.new(0,9)}, run)
local status = make("TextLabel", {LayoutOrder=5,Size=UDim2.new(1,0,0,24),BackgroundTransparency=1,Text="Hazır",TextColor3=Color3.fromRGB(154,166,188),TextSize=10,Font=Enum.Font.Gotham,TextXAlignment=Enum.TextXAlignment.Left}, root) :: TextLabel

local baseUrl = tostring(plugin:GetSetting(SETTINGS_URL) or DEFAULT_URL):gsub("/+$", "")
local token = tostring(plugin:GetSetting(SETTINGS_TOKEN) or "")

local function pathOf(instance: Instance): string
    local parts = {}
    local current: Instance? = instance
    while current and current ~= game do table.insert(parts,1,current.Name); current=current.Parent end
    return table.concat(parts,".")
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
    selectionLabel.Text = #paths > 0 and ("Seçim: " .. table.concat(paths, ", ")) or "Seçim: yok"
end

local function pair(): boolean
    local ok, result = pcall(function()
        return HttpService:RequestAsync({Url=baseUrl .. "/pair",Method="GET",Headers={["Content-Type"]="application/json"}})
    end)
    if not ok or not result.Success then return false end
    local decodedOk, decoded = pcall(function() return HttpService:JSONDecode(result.Body) end)
    if not decodedOk or not decoded.token then return false end
    token = tostring(decoded.token)
    baseUrl = tostring(decoded.url or DEFAULT_URL):gsub("/+$", "")
    plugin:SetSetting(SETTINGS_TOKEN, token)
    plugin:SetSetting(SETTINGS_URL, baseUrl)
    return true
end

local function send()
    local goal = box.Text:gsub("^%s+",""):gsub("%s+$","")
    if goal == "" then status.Text = "Önce komut yaz." return end
    if token == "" and not pair() then status.Text = "Hub açıkken tekrar dene." return end
    status.Text = "Gönderiliyor…"
    task.spawn(function()
        local ok, result = pcall(function()
            return HttpService:RequestAsync({
                Url=baseUrl .. "/action",Method="POST",
                Headers={["Content-Type"]="application/json",["X-ZeroScript-Token"]=token},
                Body=HttpService:JSONEncode({action="workbench_start",payload={goal=goal,source="studio_palette",selectionPaths=selectedPaths()}}),
            })
        end)
        status.Text = ok and result.Success and "Başladı" or "Gönderilemedi"
    end)
end

run.Activated:Connect(send)
Selection.SelectionChanged:Connect(updateSelection)
local function openPalette()
    widget.Enabled = true
    updateSelection()
    pair()
    task.defer(function() box:CaptureFocus() end)
end
button.Click:Connect(openPalette)
action.Triggered:Connect(openPalette)
widget:GetPropertyChangedSignal("Enabled"):Connect(function() button:SetActive(widget.Enabled) end)
updateSelection()
