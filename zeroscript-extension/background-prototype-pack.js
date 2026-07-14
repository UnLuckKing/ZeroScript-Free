// SPDX-License-Identifier: GPL-3.0-or-later
// ZeroScript 1.34 Prototype Accelerator.
// Installs a production-minded Golden Template directly instead of asking an AI
// to rebuild common systems. Prototype mode uses two bounded Studio tool calls:
// one install and one verification. Launch Day may add one optional AI polish pass.

const ZS_PROTOTYPE_KEY = "zsPrototypeState";
let zsPrototype = {
  version: 1,
  state: "idle",
  mode: "prototype",
  genre: "rng",
  goal: "",
  config: null,
  activity: [],
  installCalls: 0,
  startedAt: 0,
  finishedAt: 0,
  lastError: "",
  verification: null,
  updatedAt: Date.now(),
};
let zsPrototypeStarting = false;

chrome.storage.local.get(ZS_PROTOTYPE_KEY, (result) => {
  const saved = result && result[ZS_PROTOTYPE_KEY];
  if (saved && typeof saved === "object" && ["done", "error"].includes(saved.state)) {
    zsPrototype = { ...zsPrototype, ...saved, activity: Array.isArray(saved.activity) ? saved.activity.slice(-12) : [] };
  }
});

function zsPrototypePersist() {
  zsPrototype.updatedAt = Date.now();
  zsPrototype.activity = (zsPrototype.activity || []).slice(-12);
  return chrome.storage.local.set({ [ZS_PROTOTYPE_KEY]: zsPrototype });
}

function zsPrototypeAdd(kind, text, detail = "") {
  zsPrototype.activity.push({ id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`, at: Date.now(), kind, text, detail });
  zsPrototypePersist().catch(() => {});
  broadcastTeam();
}

function zsPrototypeTheme(goal) {
  const text = String(goal || "").toLowerCase();
  if (/cute|kawaii|pastel|sevimli|tatlı/.test(text)) return "cute";
  if (/neon|cyber|sci.?fi|siber/.test(text)) return "neon";
  if (/fantasy|magic|medieval|büyü|fantastik/.test(text)) return "fantasy";
  if (/dark|void|shadow|karanlık|gölge/.test(text)) return "void";
  return "celestial";
}

function zsPrototypeTitle(goal) {
  const quoted = /["“]([^"”]{3,40})["”]/.exec(String(goal || ""));
  if (quoted) return quoted[1].trim();
  const text = String(goal || "").toLowerCase();
  if (/void|shadow|karanlık/.test(text)) return "Voidborn RNG";
  if (/cute|kawaii|pastel/.test(text)) return "Lucky Bloom RNG";
  if (/neon|cyber|sci.?fi/.test(text)) return "Neon Rift RNG";
  if (/fantasy|magic|büyü/.test(text)) return "Arcane Crown RNG";
  return "Aura Ascend RNG";
}

const ZS_AURA_PRESETS = {
  celestial: [
    ["Soft Glow", "Common", 2, "#D8E2FF"], ["Emerald Pulse", "Uncommon", 8, "#62E6A7"],
    ["Azure Rift", "Rare", 35, "#57B8FF"], ["Violet Nova", "Epic", 150, "#A878FF"],
    ["Solar Crown", "Legendary", 750, "#FFD166"], ["Astral Monarch", "Mythic", 5000, "#FF65C3"],
    ["Celestial Oath", "Celestial", 50000, "#7EE8FA"], ["Eternal Eclipse", "Secret", 1000000, "#FF5370"],
  ],
  void: [
    ["Ash", "Common", 2, "#BAC0CA"], ["Night Veil", "Uncommon", 8, "#727A98"],
    ["Abyss Spark", "Rare", 35, "#6B8CFF"], ["Void Bloom", "Epic", 150, "#9B6DFF"],
    ["Shadow King", "Legendary", 750, "#D35CFF"], ["Black Star", "Mythic", 5000, "#FF4F8B"],
    ["Null Sovereign", "Celestial", 50000, "#6FFFE9"], ["Endless Night", "Secret", 1000000, "#FF304F"],
  ],
  neon: [
    ["Pixel", "Common", 2, "#BDE0FE"], ["Circuit", "Uncommon", 8, "#48F0B0"],
    ["Blue Shift", "Rare", 35, "#31C3FF"], ["Glitch Core", "Epic", 150, "#B05CFF"],
    ["Hyper Drive", "Legendary", 750, "#FFE45E"], ["Quantum Heart", "Mythic", 5000, "#FF4DCE"],
    ["Neon Singularity", "Celestial", 50000, "#62FFF5"], ["System Zero", "Secret", 1000000, "#FF416C"],
  ],
  fantasy: [
    ["Wisp", "Common", 2, "#E9EDC9"], ["Forest Rune", "Uncommon", 8, "#74C69D"],
    ["Frost Sigil", "Rare", 35, "#74C0FC"], ["Arcane Rose", "Epic", 150, "#B197FC"],
    ["Sunblade", "Legendary", 750, "#FFD43B"], ["Dragon Soul", "Mythic", 5000, "#FF6B9A"],
    ["Divine Throne", "Celestial", 50000, "#99E9F2"], ["World Eater", "Secret", 1000000, "#FA5252"],
  ],
  cute: [
    ["Tiny Sparkle", "Common", 2, "#F8D7FF"], ["Mint Pop", "Uncommon", 8, "#B9FBC0"],
    ["Cloud Candy", "Rare", 35, "#A0C4FF"], ["Berry Dream", "Epic", 150, "#CDB4DB"],
    ["Golden Bunny", "Legendary", 750, "#FFE66D"], ["Princess Star", "Mythic", 5000, "#FF8FAB"],
    ["Rainbow Wish", "Celestial", 50000, "#9BF6FF"], ["Secret Plush", "Secret", 1000000, "#FF5D8F"],
  ],
};

function zsPrototypeConfig(goal, mode = "prototype") {
  const theme = zsPrototypeTheme(goal);
  return {
    template: "rng",
    templateVersion: 1,
    title: zsPrototypeTitle(goal),
    theme,
    uiPreset: theme === "cute" ? "soft_pastel" : theme === "neon" ? "neon_glass" : theme === "fantasy" ? "fantasy_gold" : theme === "void" ? "void_glass" : "dark_celestial",
    mapPreset: theme === "cute" ? "pastel_island" : theme === "neon" ? "neon_platform" : theme === "fantasy" ? "arcane_island" : "floating_island",
    pityTarget: 50,
    baseLuck: 1,
    luckUpgradeBaseCost: 250,
    mode,
    timeBudgetMinutes: mode === "launch" ? 45 : 15,
    toolBudget: mode === "launch" ? 35 : 2,
    auras: (ZS_AURA_PRESETS[theme] || ZS_AURA_PRESETS.celestial).map(([name, rarity, odds, color]) => ({ name, rarity, odds, color })),
  };
}

function zsRngInstallerCode(config) {
  const configLiteral = JSON.stringify(JSON.stringify(config));
  return String.raw`
local HttpService=game:GetService("HttpService")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local ServerScriptService=game:GetService("ServerScriptService")
local StarterPlayer=game:GetService("StarterPlayer")
local Workspace=game:GetService("Workspace")
local Lighting=game:GetService("Lighting")
local cfg=HttpService:JSONDecode(${configLiteral})

local function ensure(parent,className,name)
 local found=parent:FindFirstChild(name)
 if found and found.ClassName~=className then found:Destroy() found=nil end
 if not found then found=Instance.new(className) found.Name=name found.Parent=parent end
 return found
end
local function part(parent,name,size,pos,color,material)
 local p=ensure(parent,"Part",name) p.Anchored=true p.CanCollide=true p.Size=size p.Position=pos
 p.Color=color p.Material=material or Enum.Material.SmoothPlastic p.TopSurface=Enum.SurfaceType.Smooth p.BottomSurface=Enum.SurfaceType.Smooth
 return p
end
local function color(hex)
 hex=hex:gsub("#","") return Color3.fromRGB(tonumber(hex:sub(1,2),16),tonumber(hex:sub(3,4),16),tonumber(hex:sub(5,6),16))
end

local root=ensure(ReplicatedStorage,"Folder","ZeroScriptRNG")
root:SetAttribute("TemplateVersion",cfg.templateVersion or 1)
root:SetAttribute("InstalledAt",os.time())
root:SetAttribute("Title",cfg.title)
root:SetAttribute("Theme",cfg.theme)
local configValue=ensure(root,"StringValue","ConfigJson") configValue.Value=HttpService:JSONEncode(cfg)
local remotes=ensure(root,"Folder","Remotes")
for _,name in {"Roll","Equip","UpgradeLuck","GetState"} do ensure(remotes,"RemoteFunction",name) end

local server=ensure(ServerScriptService,"Script","ZeroScriptRNGServer")
server.Source=[==[
local Players=game:GetService("Players")
local DataStoreService=game:GetService("DataStoreService")
local HttpService=game:GetService("HttpService")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local root=ReplicatedStorage:WaitForChild("ZeroScriptRNG")
local cfg=HttpService:JSONDecode(root:WaitForChild("ConfigJson").Value)
local remotes=root:WaitForChild("Remotes")
local store=DataStoreService:GetDataStore("ZeroScriptRNG_v1")
local sessions={} local cooldown={}
local rarityRank={Common=1,Uncommon=2,Rare=3,Epic=4,Legendary=5,Mythic=6,Celestial=7,Secret=8}
local function defaults() return {Coins=0,Luck=tonumber(cfg.baseLuck) or 1,Pity=0,Inventory={},Equipped=""} end
local function clean(raw)
 local d=defaults() if type(raw)~="table" then return d end
 d.Coins=math.max(0,math.floor(tonumber(raw.Coins) or 0)) d.Luck=math.clamp(tonumber(raw.Luck) or 1,1,100)
 d.Pity=math.max(0,math.floor(tonumber(raw.Pity) or 0)) d.Equipped=type(raw.Equipped)=="string" and raw.Equipped or ""
 if type(raw.Inventory)=="table" then for name,count in pairs(raw.Inventory) do if type(name)=="string" then d.Inventory[name]=math.clamp(math.floor(tonumber(count) or 0),0,999999) end end end
 return d
end
local function public(d) return {Coins=d.Coins,Luck=d.Luck,Pity=d.Pity,Inventory=d.Inventory,Equipped=d.Equipped,PityTarget=cfg.pityTarget,Auras=cfg.auras,Title=cfg.title} end
local function save(player)
 local d=sessions[player] if not d then return end
 pcall(function() store:UpdateAsync("u_"..player.UserId,function() return clean(d) end) end)
end
local function updateStats(player,d)
 local ls=player:FindFirstChild("leaderstats") if not ls then ls=Instance.new("Folder") ls.Name="leaderstats" ls.Parent=player end
 local coins=ls:FindFirstChild("Coins") or Instance.new("IntValue") coins.Name="Coins" coins.Parent=ls coins.Value=math.floor(d.Coins)
 local luck=ls:FindFirstChild("Luck") or Instance.new("NumberValue") luck.Name="Luck" luck.Parent=ls luck.Value=d.Luck
end
local function weighted(d)
 local pityTarget=tonumber(cfg.pityTarget) or 50 local pity=d.Pity>=pityTarget-1
 local pool={} local total=0
 for _,a in ipairs(cfg.auras) do
  local rank=rarityRank[a.rarity] or 1
  if not pity or rank>=3 then local weight=(1/math.max(1,tonumber(a.odds) or 1))*(rank>=3 and d.Luck or 1) total+=weight table.insert(pool,{Aura=a,Weight=weight}) end
 end
 local target=Random.new():NextNumber()*total local sum=0
 for _,entry in ipairs(pool) do sum+=entry.Weight if target<=sum then return entry.Aura end end
 return pool[1].Aura
end
Players.PlayerAdded:Connect(function(player)
 local raw=nil pcall(function() raw=store:GetAsync("u_"..player.UserId) end)
 local d=clean(raw) sessions[player]=d updateStats(player,d)
end)
Players.PlayerRemoving:Connect(function(player) save(player) sessions[player]=nil cooldown[player]=nil end)
game:BindToClose(function() for player in pairs(sessions) do save(player) end task.wait(1) end)
remotes.GetState.OnServerInvoke=function(player) local d=sessions[player] return d and public(d) or nil end
remotes.Roll.OnServerInvoke=function(player)
 local d=sessions[player] if not d then return nil end
 local now=os.clock() if cooldown[player] and now-cooldown[player]<0.65 then return {Error="Cooldown",State=public(d)} end cooldown[player]=now
 local aura=weighted(d) local rank=rarityRank[aura.rarity] or 1
 d.Pity=rank>=3 and 0 or d.Pity+1 d.Inventory[aura.name]=(d.Inventory[aura.name] or 0)+1
 local reward=math.max(1,math.floor(math.log10(math.max(2,aura.odds))*12)) d.Coins+=reward updateStats(player,d)
 return {Aura=aura,Reward=reward,State=public(d)}
end
remotes.Equip.OnServerInvoke=function(player,name)
 local d=sessions[player] if not d or type(name)~="string" or not d.Inventory[name] or d.Inventory[name]<=0 then return {Error="NotOwned",State=d and public(d) or nil} end
 d.Equipped=name return {State=public(d)}
end
remotes.UpgradeLuck.OnServerInvoke=function(player)
 local d=sessions[player] if not d then return nil end
 local cost=math.floor((tonumber(cfg.luckUpgradeBaseCost) or 250)*(1.55^(d.Luck-1)))
 if d.Coins<cost then return {Error="NotEnough",Cost=cost,State=public(d)} end
 d.Coins-=cost d.Luck=math.min(100,math.floor((d.Luck+0.25)*100)/100) updateStats(player,d)
 return {Cost=cost,State=public(d)}
end
]==]
server:SetAttribute("ZeroScriptManaged",true)

local starterScripts=StarterPlayer:WaitForChild("StarterPlayerScripts")
local client=ensure(starterScripts,"LocalScript","ZeroScriptRNGClient")
client.Source=[==[
local Players=game:GetService("Players")
local ReplicatedStorage=game:GetService("ReplicatedStorage")
local TweenService=game:GetService("TweenService")
local player=Players.LocalPlayer
local root=ReplicatedStorage:WaitForChild("ZeroScriptRNG") local remotes=root:WaitForChild("Remotes")
local state=nil local busy=false
local function hex(value) value=(value or "#FFFFFF"):gsub("#","") return Color3.fromRGB(tonumber(value:sub(1,2),16) or 255,tonumber(value:sub(3,4),16) or 255,tonumber(value:sub(5,6),16) or 255) end
local function round(object,radius) local c=Instance.new("UICorner") c.CornerRadius=UDim.new(0,radius or 12) c.Parent=object return c end
local function stroke(object,color,thickness,transparency) local s=Instance.new("UIStroke") s.Color=color s.Thickness=thickness or 1 s.Transparency=transparency or 0 s.Parent=object return s end
local function label(parent,text,size,font) local x=Instance.new("TextLabel") x.BackgroundTransparency=1 x.Text=text x.TextColor3=Color3.fromRGB(245,247,255) x.TextSize=size or 16 x.Font=font or Enum.Font.Gotham x.TextXAlignment=Enum.TextXAlignment.Left x.Parent=parent return x end
local gui=Instance.new("ScreenGui") gui.Name="ZeroScriptRNGGui" gui.ResetOnSpawn=false gui.IgnoreGuiInset=false gui.Parent=player:WaitForChild("PlayerGui")
local scale=Instance.new("UIScale") scale.Parent=gui
local function resize() local v=workspace.CurrentCamera and workspace.CurrentCamera.ViewportSize or Vector2.new(1280,720) scale.Scale=math.clamp(math.min(v.X/1280,v.Y/720),0.72,1.08) end
resize() if workspace.CurrentCamera then workspace.CurrentCamera:GetPropertyChangedSignal("ViewportSize"):Connect(resize) end
local bg=Instance.new("Frame") bg.Size=UDim2.new(0,760,0,500) bg.AnchorPoint=Vector2.new(.5,.5) bg.Position=UDim2.fromScale(.5,.52) bg.BackgroundColor3=Color3.fromRGB(13,17,30) bg.Parent=gui round(bg,20) stroke(bg,Color3.fromRGB(104,91,196),2,.25)
local grad=Instance.new("UIGradient") grad.Color=ColorSequence.new(Color3.fromRGB(20,25,45),Color3.fromRGB(10,13,25)) grad.Rotation=110 grad.Parent=bg
local header=label(bg,"AURA ASCEND RNG",24,Enum.Font.GothamBold) header.Position=UDim2.new(0,24,0,18) header.Size=UDim2.new(1,-48,0,34)
local stats=label(bg,"Loading…",14,Enum.Font.GothamMedium) stats.Position=UDim2.new(0,24,0,54) stats.Size=UDim2.new(1,-48,0,24) stats.TextColor3=Color3.fromRGB(170,181,215)
local result=label(bg,"Press ROLL to discover an aura",27,Enum.Font.GothamBold) result.TextXAlignment=Enum.TextXAlignment.Center result.Position=UDim2.new(0,24,0,98) result.Size=UDim2.new(0,430,0,90)
local odds=label(bg,"",14,Enum.Font.GothamMedium) odds.TextXAlignment=Enum.TextXAlignment.Center odds.Position=UDim2.new(0,24,0,178) odds.Size=UDim2.new(0,430,0,26)
local roll=Instance.new("TextButton") roll.Text="✦ ROLL" roll.TextColor3=Color3.new(1,1,1) roll.TextSize=22 roll.Font=Enum.Font.GothamBold roll.BackgroundColor3=Color3.fromRGB(118,86,255) roll.Position=UDim2.new(0,54,0,228) roll.Size=UDim2.new(0,370,0,62) roll.Parent=bg round(roll,16)
local upgrade=Instance.new("TextButton") upgrade.Text="Upgrade Luck" upgrade.TextColor3=Color3.new(1,1,1) upgrade.TextSize=15 upgrade.Font=Enum.Font.GothamBold upgrade.BackgroundColor3=Color3.fromRGB(35,45,72) upgrade.Position=UDim2.new(0,94,0,304) upgrade.Size=UDim2.new(0,290,0,46) upgrade.Parent=bg round(upgrade,12) stroke(upgrade,Color3.fromRGB(88,107,166),1,.3)
local pity=label(bg,"Pity 0 / 50",14,Enum.Font.GothamMedium) pity.TextXAlignment=Enum.TextXAlignment.Center pity.Position=UDim2.new(0,54,0,365) pity.Size=UDim2.new(0,370,0,30)
local tip=label(bg,"Rare+ resets pity • Duplicates earn collection progress",12,Enum.Font.Gotham) tip.TextXAlignment=Enum.TextXAlignment.Center tip.TextColor3=Color3.fromRGB(126,139,176) tip.Position=UDim2.new(0,36,1,-50) tip.Size=UDim2.new(0,410,0,24)
local invTitle=label(bg,"INVENTORY",16,Enum.Font.GothamBold) invTitle.Position=UDim2.new(0,480,0,98) invTitle.Size=UDim2.new(0,250,0,28)
local list=Instance.new("ScrollingFrame") list.BackgroundColor3=Color3.fromRGB(9,12,22) list.BorderSizePixel=0 list.Position=UDim2.new(0,480,0,132) list.Size=UDim2.new(0,250,0,316) list.ScrollBarThickness=5 list.AutomaticCanvasSize=Enum.AutomaticSize.Y list.CanvasSize=UDim2.new() list.Parent=bg round(list,13) stroke(list,Color3.fromRGB(70,79,116),1,.4)
local layout=Instance.new("UIListLayout") layout.Padding=UDim.new(0,7) layout.Parent=list local pad=Instance.new("UIPadding") pad.PaddingTop=UDim.new(0,9) pad.PaddingBottom=UDim.new(0,9) pad.PaddingLeft=UDim.new(0,9) pad.PaddingRight=UDim.new(0,9) pad.Parent=list
local auraByName={}
local function formatNumber(n) n=tonumber(n) or 0 if n>=1e9 then return string.format("%.1fB",n/1e9) elseif n>=1e6 then return string.format("%.1fM",n/1e6) elseif n>=1e3 then return string.format("%.1fK",n/1e3) end return tostring(math.floor(n)) end
local function render()
 if not state then return end
 header.Text=state.Title or "AURA ASCEND RNG" stats.Text="Coins  "..formatNumber(state.Coins).."     Luck  x"..string.format("%.2f",state.Luck or 1).."     Equipped  "..((state.Equipped~="" and state.Equipped) or "None") pity.Text="Pity  "..tostring(state.Pity or 0).." / "..tostring(state.PityTarget or 50)
 auraByName={} for _,a in ipairs(state.Auras or {}) do auraByName[a.name]=a end
 for _,child in ipairs(list:GetChildren()) do if child:IsA("TextButton") then child:Destroy() end end
 local names={} for name,count in pairs(state.Inventory or {}) do if count>0 then table.insert(names,name) end end
 table.sort(names,function(a,b) return (auraByName[a] and auraByName[a].odds or 0)>(auraByName[b] and auraByName[b].odds or 0) end)
 for _,name in ipairs(names) do local a=auraByName[name] or {rarity="Unknown",odds=0,color="#FFFFFF"} local b=Instance.new("TextButton") b.Size=UDim2.new(1,0,0,52) b.BackgroundColor3=Color3.fromRGB(24,29,47) b.TextColor3=hex(a.color) b.TextSize=13 b.Font=Enum.Font.GothamSemibold b.TextXAlignment=Enum.TextXAlignment.Left b.Text="  "..name.."  ×"..tostring(state.Inventory[name]).."\n  "..a.rarity.." • 1 in "..formatNumber(a.odds) b.Parent=list round(b,10) b.Activated:Connect(function() local ok,res=pcall(function() return remotes.Equip:InvokeServer(name) end) if ok and res and res.State then state=res.State render() end end) end
end
local function fetch() local ok,res=pcall(function() return remotes.GetState:InvokeServer() end) if ok and res then state=res render() end end
roll.Activated:Connect(function()
 if busy then return end busy=true roll.Text="ROLLING…" TweenService:Create(roll,TweenInfo.new(.15),{Size=UDim2.new(0,356,0,58),Position=UDim2.new(0,61,0,230)}):Play()
 local ok,res=pcall(function() return remotes.Roll:InvokeServer() end) task.wait(.28)
 roll.Text="✦ ROLL" TweenService:Create(roll,TweenInfo.new(.16,Enum.EasingStyle.Back),{Size=UDim2.new(0,370,0,62),Position=UDim2.new(0,54,0,228)}):Play()
 if ok and res and res.Aura then result.Text=res.Aura.name result.TextColor3=hex(res.Aura.color) odds.Text=res.Aura.rarity.."  •  1 in "..formatNumber(res.Aura.odds).."  •  +"..tostring(res.Reward or 0).." coins" state=res.State render() elseif res and res.State then state=res.State render() end busy=false
end)
upgrade.Activated:Connect(function() local ok,res=pcall(function() return remotes.UpgradeLuck:InvokeServer() end) if ok and res and res.State then state=res.State render() upgrade.Text=res.Error=="NotEnough" and ("Need "..formatNumber(res.Cost).." coins") or "Luck upgraded!" task.delay(1,function() upgrade.Text="Upgrade Luck" end) end end)
fetch()
]==]
client:SetAttribute("ZeroScriptManaged",true)

local oldWorld=Workspace:FindFirstChild("ZeroScriptRNGWorld") if oldWorld then oldWorld:Destroy() end
local world=Instance.new("Folder") world.Name="ZeroScriptRNGWorld" world.Parent=Workspace world:SetAttribute("Preset",cfg.mapPreset)
local baseColor=cfg.theme=="cute" and Color3.fromRGB(255,207,232) or cfg.theme=="neon" and Color3.fromRGB(24,33,52) or cfg.theme=="fantasy" and Color3.fromRGB(74,88,66) or Color3.fromRGB(35,39,62)
local accent=cfg.theme=="cute" and Color3.fromRGB(150,220,255) or cfg.theme=="neon" and Color3.fromRGB(0,225,255) or cfg.theme=="fantasy" and Color3.fromRGB(255,199,76) or color(cfg.auras[4].color)
local island=part(world,"Island",Vector3.new(120,5,120),Vector3.new(0,0,0),baseColor,Enum.Material.Slate) island.Shape=Enum.PartType.Cylinder island.Orientation=Vector3.new(0,0,90)
local trim=part(world,"IslandGlow",Vector3.new(122,1.2,122),Vector3.new(0,-2.8,0),accent,Enum.Material.Neon) trim.Shape=Enum.PartType.Cylinder trim.Orientation=Vector3.new(0,0,90) trim.CanCollide=false
local altar=part(world,"RollingAltar",Vector3.new(18,2,18),Vector3.new(0,4,0),Color3.fromRGB(22,25,42),Enum.Material.SmoothPlastic) altar.Shape=Enum.PartType.Cylinder altar.Orientation=Vector3.new(0,0,90)
local core=part(world,"AuraCore",Vector3.new(7,7,7),Vector3.new(0,10,0),accent,Enum.Material.Neon) core.Shape=Enum.PartType.Ball core.CanCollide=false
local light=ensure(core,"PointLight","Glow") light.Color=accent light.Brightness=3 light.Range=28
local spawn=ensure(world,"SpawnLocation","Spawn") spawn.Anchored=true spawn.Neutral=true spawn.Size=Vector3.new(12,1,12) spawn.Position=Vector3.new(0,3,35) spawn.Color=Color3.fromRGB(80,92,126) spawn.Material=Enum.Material.SmoothPlastic
local sign=part(world,"TitleSign",Vector3.new(28,10,1),Vector3.new(0,10,-24),Color3.fromRGB(16,19,31),Enum.Material.SmoothPlastic)
local surface=ensure(sign,"SurfaceGui","TitleGui") surface.Face=Enum.NormalId.Front surface.AlwaysOnTop=true
local text=ensure(surface,"TextLabel","Title") text.Size=UDim2.fromScale(1,1) text.BackgroundTransparency=1 text.Text=cfg.title.."\nROLL • COLLECT • ASCEND" text.TextColor3=Color3.fromRGB(245,247,255) text.Font=Enum.Font.GothamBold text.TextScaled=true
Lighting.Brightness=2 Lighting.ClockTime=18.5 Lighting.Ambient=Color3.fromRGB(60,67,96) Lighting.OutdoorAmbient=Color3.fromRGB(84,90,120)
local atmosphere=ensure(Lighting,"Atmosphere","ZeroScriptAtmosphere") atmosphere.Density=.25 atmosphere.Haze=1.2 atmosphere.Color=Color3.fromRGB(170,183,255)

return "ZS_TEMPLATE_OK:"..HttpService:JSONEncode({title=cfg.title,theme=cfg.theme,server=server:GetFullName(),client=client:GetFullName(),world=world:GetFullName(),remotes=#remotes:GetChildren()})`;
}

function zsRngVerifyCode() {
  return String.raw`
local HttpService=game:GetService("HttpService")
local RS=game:GetService("ReplicatedStorage")
local SSS=game:GetService("ServerScriptService")
local SP=game:GetService("StarterPlayer")
local W=game:GetService("Workspace")
local root=RS:FindFirstChild("ZeroScriptRNG")
local server=SSS:FindFirstChild("ZeroScriptRNGServer")
local client=SP.StarterPlayerScripts:FindFirstChild("ZeroScriptRNGClient")
local world=W:FindFirstChild("ZeroScriptRNGWorld")
local checks={root=root~=nil,server=server~=nil and #server.Source>1000,client=client~=nil and #client.Source>1000,world=world~=nil,remotes=root and root:FindFirstChild("Remotes") and #root.Remotes:GetChildren()>=4 or false,spawn=world and world:FindFirstChild("Spawn")~=nil or false}
local ok=true for _,value in pairs(checks) do if not value then ok=false end end
return "ZS_TEMPLATE_VERIFY:"..HttpService:JSONEncode({ok=ok,checks=checks})`;
}

async function zsPrototypeToolCall(code, timeout = 120000) {
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!tool) return { ok: false, error: "execute_luau aracı bulunamadı." };
  zsPrototype.installCalls += 1;
  return send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout }, timeout + 10000);
}

async function zsPrototypeStart(goal, mode = "prototype") {
  const cleanGoal = String(goal || "").trim();
  if (!cleanGoal) return { ok: false, error: "Oyun fikri boş." };
  if (zsPrototypeStarting) return { ok: false, error: "Prototip zaten hazırlanıyor." };
  zsPrototypeStarting = true;
  try {
    await zsEasyHardReset("Yeni hızlı prototip eski işi değiştirdi.");
    const config = zsPrototypeConfig(cleanGoal, mode);
    zsPrototype = { version: 1, state: "preparing", mode, genre: "rng", goal: cleanGoal, config, activity: [], installCalls: 0, startedAt: Date.now(), finishedAt: 0, lastError: "", verification: null, updatedAt: Date.now() };
    zsPrototypeAdd("done", "Oyun ayarları oluşturuldu", `${config.title} • ${config.theme} • ${config.uiPreset}`);
    const ready = await ensureStudioReadyForTask();
    if (!ready.ok) throw new Error(ready.error || "Roblox Studio hazır değil.");
    zsPrototype.state = "installing";
    zsPrototypeAdd("active", "Golden RNG Template kuruluyor", "Server, kayıt, roll, pity, luck, inventory, UI ve map tek işlemde kuruluyor");
    const install = await zsPrototypeToolCall(zsRngInstallerCode(config), 150000);
    if (!install || !install.ok || !/ZS_TEMPLATE_OK:/.test(String(install.text || ""))) throw new Error(String(install && (install.error || install.text) || "Template kurulamadı."));
    zsPrototypeAdd("done", "Çalışan oyun iskeleti kuruldu", `Studio tool çağrısı ${zsPrototype.installCalls}/${config.toolBudget}`);
    zsPrototype.state = "verifying";
    zsPrototypeAdd("active", "Kurulum doğrulanıyor", "Gerekli script, remote, UI ve dünya nesneleri kontrol ediliyor");
    const verify = await zsPrototypeToolCall(zsRngVerifyCode(), 60000);
    const match = verify && verify.ok && /ZS_TEMPLATE_VERIFY:(\{[\s\S]*\})/.exec(String(verify.text || ""));
    if (!match) throw new Error(String(verify && (verify.error || verify.text) || "Template doğrulaması cevap vermedi."));
    const verification = JSON.parse(match[1]);
    zsPrototype.verification = verification;
    if (!verification.ok) throw new Error(`Template doğrulaması başarısız: ${JSON.stringify(verification.checks)}`);
    zsPrototypeAdd("done", "Prototip doğrulandı", "Ana sistemler mevcut; Studio'da Play ile açılabilir");
    if (mode === "launch") {
      zsPrototype.state = "polishing";
      zsPrototypeAdd("active", "Launch Day polish başlıyor", "Tek AI geçişi yalnızca test, oyun hissi ve yayın engellerine odaklanacak");
      const polishGoal = `The Golden RNG Template is already installed for ${config.title}. Do not rebuild it. In one bounded pass, inspect and playtest the actual game, fix only verified runtime/UI/mobile/onboarding issues, improve game feel with lightweight feedback, confirm saving code and server authority, read Output, and stop when the main loop is publishable. Time budget: 45 minutes. Tool budget: 35. No reviewer task, no new major systems, no world expansion.`;
      const workbench = await zsWorkbenchStart(polishGoal, "launch_day");
      if (!workbench || workbench.ok === false) {
        zsPrototypeAdd("warn", "Template hazır, polish başlatılamadı", String(workbench && workbench.error || "AI hazır değil"));
      } else {
        zsPrototypeAdd("done", "Launch polish AI'ye verildi", workbench.provider || "AI");
      }
    } else {
      zsPrototype.state = "done";
      zsPrototype.finishedAt = Date.now();
      zsPrototypeAdd("done", "15 dakikalık prototip hazır", `${config.title} • ${Math.max(1, Math.round((Date.now()-zsPrototype.startedAt)/1000))} saniye`);
    }
    await zsPrototypePersist();
    broadcastTeam();
    return { ok: true, prototype: zsPrototype };
  } catch (error) {
    zsPrototype.state = "error";
    zsPrototype.lastError = String(error && error.message || error);
    zsPrototype.finishedAt = Date.now();
    zsPrototypeAdd("error", "Prototip tamamlanamadı", zsPrototype.lastError);
    return { ok: false, error: zsPrototype.lastError };
  } finally {
    zsPrototypeStarting = false;
  }
}

function zsPrototypePublic() {
  return { ...zsPrototype };
}

const zsPrototypeCoreTeamObj = teamObj;
teamObj = function zsPrototypeTeamObj() { return { ...zsPrototypeCoreTeamObj(), prototype: zsPrototypePublic() }; };

const zsPrototypeCoreStatusPayload = zsStudioPanelStatusPayload;
zsStudioPanelStatusPayload = function zsPrototypeStatusPayload() {
  const payload = zsPrototypeCoreStatusPayload();
  payload.prototype = zsPrototypePublic();
  return payload;
};

const zsPrototypeCoreHubAction = zsStudioPanelHandleAction;
zsStudioPanelHandleAction = async function zsPrototypeHubAction(item) {
  const action = String(item && item.action || "").toLowerCase();
  const payload = item && item.payload && typeof item.payload === "object" ? item.payload : {};
  if (action === "prototype_start") { await zsPrototypeStart(payload.goal || payload.idea || "", "prototype"); return; }
  if (action === "launch_day_start") { await zsPrototypeStart(payload.goal || payload.idea || "", "launch"); return; }
  return zsPrototypeCoreHubAction(item);
};
