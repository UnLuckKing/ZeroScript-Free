// SPDX-License-Identifier: GPL-3.0-or-later
// Safer instance snapshot implementation: preserve Camera/Terrain/live players,
// pcall every clone/parent operation, and restore important service properties.

zsAutomationAttachInstanceBackup = async function zsSafeAttachInstanceBackup(checkpointId) {
  if (!zsAutomation.settings.instanceRollback || !checkpointId || !teamTask) return { ok: false, skipped: true };
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!tool || !connected || studioConnected === false) return { ok: false, error: "Studio unavailable" };
  const scopes = zsAutomationScopes(teamTask.goal);
  const code = `local ServerStorage=game:GetService("ServerStorage")
local HttpService=game:GetService("HttpService")
local root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") local cp=root and root:FindFirstChild(${JSON.stringify(checkpointId)}) if not cp then return "INSTANCE_BACKUP_ERROR:no checkpoint" end
local old=cp:FindFirstChild("InstanceBackup") if old then old:Destroy() end
local backup=Instance.new("Folder") backup.Name="InstanceBackup" backup.Parent=cp backup:SetAttribute("ScopesJson",${JSON.stringify(JSON.stringify(scopes))})
local saved,skipped=0,0
local scopes=HttpService:JSONDecode(${JSON.stringify(JSON.stringify(scopes))})
local function protected(child) return child.Name=="ZeroScriptCheckpoints" or child:IsA("Terrain") or child:IsA("Player") or child:IsA("Camera") end
for _,serviceName in scopes do
 local ok,service=pcall(function() return game:GetService(serviceName) end)
 if ok and service then
  local count=#service:GetDescendants()
  local bucket=Instance.new("Folder") bucket.Name=serviceName bucket.Parent=backup bucket:SetAttribute("OriginalDescendants",count)
  if count<=7000 then
   for _,child in service:GetChildren() do
    if not protected(child) then
     local arch=child.Archivable pcall(function() child.Archivable=true end)
     local cloneOk,clone=pcall(function() return child:Clone() end)
     pcall(function() child.Archivable=arch end)
     local parentOk=false
     if cloneOk and clone then parentOk=pcall(function() clone.Parent=bucket end) end
     if parentOk then saved+=1 else skipped+=1 if clone then pcall(function() clone:Destroy() end) end end
    end
   end
   if serviceName=="Lighting" then
    bucket:SetAttribute("Brightness",service.Brightness) bucket:SetAttribute("ClockTime",service.ClockTime) bucket:SetAttribute("ExposureCompensation",service.ExposureCompensation) bucket:SetAttribute("GlobalShadows",service.GlobalShadows)
    bucket:SetAttribute("AmbientR",service.Ambient.R) bucket:SetAttribute("AmbientG",service.Ambient.G) bucket:SetAttribute("AmbientB",service.Ambient.B)
    bucket:SetAttribute("OutdoorR",service.OutdoorAmbient.R) bucket:SetAttribute("OutdoorG",service.OutdoorAmbient.G) bucket:SetAttribute("OutdoorB",service.OutdoorAmbient.B)
   elseif serviceName=="Workspace" then
    bucket:SetAttribute("Gravity",service.Gravity) bucket:SetAttribute("FallenPartsDestroyHeight",service.FallenPartsDestroyHeight)
   end
   bucket:SetAttribute("Complete",true)
  else bucket:SetAttribute("Complete",false) bucket:SetAttribute("SkipReason","scope too large") skipped+=1 end
 end
end
backup:SetAttribute("SavedTopLevel",saved) backup:SetAttribute("Skipped",skipped) backup:SetAttribute("CreatedAt",os.time())
return "INSTANCE_BACKUP_OK:"..saved..":skipped="..skipped`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 90000 }, 100000);
  const ok = !!(result && result.ok && /INSTANCE_BACKUP_OK:/.test(String(result.text || "")));
  zsAutomation.instanceBackup = { latest: checkpointId, status: ok ? "saved" : "error", detail: String(result && (result.text || result.error) || "Instance backup failed"), scopes, at: Date.now() };
  await zsAutomationPersist(); broadcastTeam();
  return { ok, detail: zsAutomation.instanceBackup.detail };
};

zsAutomationRestoreInstanceBackup = async function zsSafeRestoreInstanceBackup(checkpointId) {
  const tool = typeof robloxTool === "function" ? robloxTool("execute_luau") : null;
  if (!checkpointId || !tool || !connected || studioConnected === false) return { ok: false, error: "No checkpoint or Studio connection." };
  const code = `local ServerStorage=game:GetService("ServerStorage")
local root=ServerStorage:FindFirstChild("ZeroScriptCheckpoints") local cp=root and root:FindFirstChild(${JSON.stringify(checkpointId)}) local backup=cp and cp:FindFirstChild("InstanceBackup") if not backup then return "INSTANCE_RESTORE_SKIP:no instance backup" end
local restored,skipped=0,0
local function protected(child) return child.Name=="ZeroScriptCheckpoints" or child:IsA("Terrain") or child:IsA("Player") or child:IsA("Camera") end
for _,bucket in backup:GetChildren() do
 if bucket:IsA("Folder") and bucket:GetAttribute("Complete")==true then
  local ok,service=pcall(function() return game:GetService(bucket.Name) end)
  if ok and service then
   for _,child in service:GetChildren() do if not protected(child) then pcall(function() child:Destroy() end) end end
   for _,child in bucket:GetChildren() do
    local cloneOk,clone=pcall(function() return child:Clone() end)
    local parentOk=false
    if cloneOk and clone then parentOk=pcall(function() clone.Parent=service end) end
    if parentOk then restored+=1 else skipped+=1 if clone then pcall(function() clone:Destroy() end) end end
   end
   if bucket.Name=="Lighting" then
    pcall(function()
     service.Brightness=bucket:GetAttribute("Brightness") service.ClockTime=bucket:GetAttribute("ClockTime") service.ExposureCompensation=bucket:GetAttribute("ExposureCompensation") service.GlobalShadows=bucket:GetAttribute("GlobalShadows")
     service.Ambient=Color3.new(bucket:GetAttribute("AmbientR"),bucket:GetAttribute("AmbientG"),bucket:GetAttribute("AmbientB"))
     service.OutdoorAmbient=Color3.new(bucket:GetAttribute("OutdoorR"),bucket:GetAttribute("OutdoorG"),bucket:GetAttribute("OutdoorB"))
    end)
   elseif bucket.Name=="Workspace" then pcall(function() service.Gravity=bucket:GetAttribute("Gravity") service.FallenPartsDestroyHeight=bucket:GetAttribute("FallenPartsDestroyHeight") end) end
  end
 end
end
pcall(function() game:GetService("ChangeHistoryService"):SetWaypoint("ZeroScript instance rollback ${checkpointId}") end)
return "INSTANCE_RESTORE_OK:"..restored..":skipped="..skipped`;
  const result = await send({ type: "call_tool", name: tool.name, arguments: { code, datamodel_type: "Edit" }, timeout: 120000 }, 130000);
  const ok = !!(result && result.ok && /INSTANCE_RESTORE_OK:/.test(String(result.text || "")));
  zsAutomation.instanceBackup = { ...zsAutomation.instanceBackup, latest: checkpointId, status: ok ? "restored" : "error", detail: String(result && (result.text || result.error) || "Instance restore failed"), at: Date.now() };
  await zsAutomationPersist(); broadcastTeam();
  return { ok, detail: zsAutomation.instanceBackup.detail };
};
