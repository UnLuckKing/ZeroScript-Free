// SPDX-License-Identifier: GPL-3.0-or-later
// Reliability fixes layered after the 1.30 Superior Pack.

async function zsSuperiorEnsureShadow(attempt = 0) {
  const intent = zsSuperior && zsSuperior.intent;
  if (!intent || !intent.shadowRequired || !zsSuperior.settings.shadowGuard || !teamTask) return;
  if (zsSuperior.shadow && zsSuperior.shadow.status === "ready" && zsSuperior.shadow.taskId === teamTask.id) return;
  if (!connected || studioConnected === false || writerLease) {
    if (attempt < 12) setTimeout(() => zsSuperiorEnsureShadow(attempt + 1).catch(() => {}), 750);
    return;
  }
  const result = await zsSuperiorPrepareShadow().catch((error) => ({ ok: false, error: String(error) }));
  if (!result || !result.ok) {
    const detail = String(result && result.error || "Shadow Guard could not start.");
    const transient = /busy|unavailable|active task|connection/i.test(detail);
    if (transient && attempt < 12) setTimeout(() => zsSuperiorEnsureShadow(attempt + 1).catch(() => {}), 900);
  }
}

const zsSuperiorFixCoreStartTask = startTeamTask;
startTeamTask = async function zsSuperiorStartWithReliableShadow(goal) {
  const result = await zsSuperiorFixCoreStartTask(goal);
  setTimeout(() => zsSuperiorEnsureShadow().catch(() => {}), 200);
  return result;
};

const zsSuperiorFixCoreProof = zsSuperiorEvaluateProof;
zsSuperiorEvaluateProof = async function zsSuperiorProofWithJuryState() {
  const proof = await zsSuperiorFixCoreProof();
  if (proof && zsSuperior.jury && zsSuperior.jury.taskId === proof.taskId) {
    zsSuperior.jury.status = proof.checks && proof.checks.juryEvidence ? "evidence_found" : "evidence_missing";
    zsSuperior.jury.detail = proof.checks && proof.checks.juryEvidence
      ? "Independent reviewer/jury evidence was recorded."
      : "The task ended without an explicit independent jury verdict.";
    await zsSuperiorPersist();
    broadcastTeam();
  }
  return proof;
};
