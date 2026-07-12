// SPDX-License-Identifier: GPL-3.0-or-later
// Follow-up safeguards for the 1.27 productivity pack.

const zsProductivityFullPublic = zsProductivityPublic;
zsProductivityPublic = function zsCompactProductivityPublic() {
  const value = zsProductivityFullPublic();
  const index = value.projectIndex || {};
  const report = index.report || {};
  value.projectIndex = {
    status: index.status || "idle",
    builtAt: Number(index.builtAt || 0),
    error: String(index.error || ""),
    counts: report.counts || null,
    samples: {
      scripts: Array.isArray(report.scripts) ? report.scripts.slice(0, 12) : [],
      remotes: Array.isArray(report.remotes) ? report.remotes.slice(0, 12) : [],
      guis: Array.isArray(report.guis) ? report.guis.slice(0, 12) : [],
    },
  };
  value.outputWatch = {
    ...value.outputWatch,
    errors: Array.isArray(value.outputWatch && value.outputWatch.errors) ? value.outputWatch.errors.slice(-20) : [],
  };
  return value;
};

// The Output watcher is background diagnostics, not part of the active agent
// turn. Never compete for the bridge while a model owns the Studio writer lease.
// The next 8-second tick will catch up after the write finishes.
const zsProductivityOutputWatchCore = zsOutputWatchTick;
zsOutputWatchTick = async function zsOutputWatchWithoutContention() {
  if (writerLease) return { skipped: true, reason: "writer_busy" };
  return zsProductivityOutputWatchCore();
};

// If a queued task cannot start because Studio is temporarily unavailable,
// retain it instead of losing it into history as a permanent start failure.
const zsProductivityQueueStartCore = zsQueueStartNext;
zsQueueStartNext = async function zsQueueStartNextSafe() {
  const before = zsProductivity.queue.map((item) => item.id);
  const result = await zsProductivityQueueStartCore();
  if (result !== false || !teamTask || teamTask.status !== "waiting") return result;
  const latest = [...zsProductivity.history].reverse().find((item) => before.includes(item.id) && item.status === "failed_to_start");
  if (latest && !zsProductivity.queue.some((item) => item.id === latest.id)) {
    latest.status = "queued";
    latest.error = teamTask.error || latest.error;
    zsProductivity.queue.push({
      id: latest.id,
      goal: latest.goal,
      qualityMode: latest.qualityMode,
      priority: latest.priority,
      dependsOn: latest.dependsOn || [],
      status: "queued",
      source: latest.source || "hub",
      createdAt: latest.createdAt || Date.now(),
      retryAfter: Date.now() + 15000,
    });
    zsProductivity.history = zsProductivity.history.filter((item) => item !== latest);
    await zsProductivityPersist();
    broadcastTeam();
  }
  return result;
};

const zsProductivityQueueRunnableCore = zsQueueRunnable;
zsQueueRunnable = function zsQueueRunnableWithRetry(item) {
  if (item && Number(item.retryAfter || 0) > Date.now()) return false;
  return zsProductivityQueueRunnableCore(item);
};
