import type { RunnableConfig } from "@langchain/core/runnables";
import {
  BaseCheckpointSaver,
  type ChannelVersions,
  type Checkpoint,
  type CheckpointListOptions,
  type CheckpointTuple,
} from "@langchain/langgraph-checkpoint";
import type { CheckpointMetadata, PendingWrite } from "@langchain/langgraph-checkpoint";
import { Redis } from "@upstash/redis";
import { isProductionEnv, resolveRedisEnv } from "../runtime/redteam";

const CHECKPOINT_TTL_SECONDS = 60 * 60 * 24; // 24h

type StoredCheckpoint = {
  checkpoint: Checkpoint;
  metadata: CheckpointMetadata;
};

function getThreadId(config: RunnableConfig): string {
  const threadId = config.configurable?.thread_id;
  if (!threadId || typeof threadId !== "string") {
    throw new Error("Missing configurable.thread_id in graph config");
  }
  return threadId;
}

function getCheckpointIdFromConfig(config: RunnableConfig): string | undefined {
  const checkpointId = config.configurable?.checkpoint_id;
  return typeof checkpointId === "string" ? checkpointId : undefined;
}

function checkpointKey(keyPrefix: string, threadId: string, checkpointId: string): string {
  return `${keyPrefix}:checkpoint:${threadId}:${checkpointId}`;
}

function latestPointerKey(keyPrefix: string, threadId: string): string {
  return `${keyPrefix}:checkpoint:latest:${threadId}`;
}

/**
 * Upstash's client auto-deserializes JSON values returned from GET, so `raw` is
 * often already a plain object. We previously only accepted strings; that made
 * getTuple() fail and getState() return empty values (empty mission history).
 */
export function parseStoredCheckpointPayload(raw: unknown): StoredCheckpoint | undefined {
  let parsed: unknown;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return undefined;
    }
  } else if (raw !== null && typeof raw === "object") {
    parsed = raw;
  } else {
    return undefined;
  }

  const stored = parsed as Partial<StoredCheckpoint>;
  if (stored.checkpoint == null || typeof stored.checkpoint !== "object") {
    return undefined;
  }
  const id = (stored.checkpoint as { id?: unknown }).id;
  if (typeof id !== "string" || id.length === 0) return undefined;

  return stored as StoredCheckpoint;
}

export class UpstashRestCheckpointer extends BaseCheckpointSaver<number> {
  private client: Redis;
  private keyPrefix: string;

  constructor() {
    super();
    const cfg = resolveRedisEnv();
    if (!cfg.url || !cfg.token) {
      throw new Error(
        "Missing Redis configuration: set UPSTASH_REDIS_REST_URL/TOKEN or RED_TEAM_UPSTASH_REDIS_REST_URL/TOKEN when REDTEAM_MODE=true.",
      );
    }
    this.keyPrefix = cfg.keyPrefix;
    this.client = new Redis({
      url: cfg.url,
      token: cfg.token,
    });
  }

  /**
   * Save checkpoint and update latest pointer for thread.
   */
  async put(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
    _newVersions: ChannelVersions,
  ): Promise<RunnableConfig> {
    const threadId = getThreadId(config);
    const checkpointId = checkpoint.id;
    const cpKey = checkpointKey(this.keyPrefix, threadId, checkpointId);
    const latestKey = latestPointerKey(this.keyPrefix, threadId);

    const payload: StoredCheckpoint = { checkpoint, metadata };

    await this.client.set(cpKey, JSON.stringify(payload), {
      ex: CHECKPOINT_TTL_SECONDS,
    });

    await this.client.set(latestKey, checkpointId, {
      ex: CHECKPOINT_TTL_SECONDS,
    });

    return {
      configurable: {
        ...config.configurable,
        thread_id: threadId,
        checkpoint_id: checkpointId,
      },
    };
  }

  /**
   * Required by BaseCheckpointSaver; noop for now.
   */
  async putWrites(
    _config: RunnableConfig,
    _writes: PendingWrite[],
    _taskId: string,
  ): Promise<void> {
    // No-op in this lightweight implementation.
  }

  /**
   * Fetch a specific checkpoint (if checkpoint_id is provided)
   * or latest checkpoint for the thread.
   */
  async getTuple(config: RunnableConfig): Promise<CheckpointTuple | undefined> {
    const threadId = getThreadId(config);
    const requestedCheckpointId = getCheckpointIdFromConfig(config);

    const checkpointId =
      requestedCheckpointId ??
      (await this.client.get<string>(latestPointerKey(this.keyPrefix, threadId)));

    if (!checkpointId) return undefined;

    const raw = await this.client.get<unknown>(
      checkpointKey(this.keyPrefix, threadId, checkpointId),
    );
    const parsed = parseStoredCheckpointPayload(raw);
    if (!parsed) return undefined;

    return {
      config: {
        configurable: {
          ...config.configurable,
          thread_id: threadId,
          checkpoint_id: checkpointId,
        },
      },
      checkpoint: parsed.checkpoint,
      metadata: parsed.metadata,
      parentConfig: undefined,
      pendingWrites: [],
    };
  }

  /**
   * Minimal list implementation: yield latest tuple only.
   * Sufficient for HITL pause/resume path.
   */
  async *list(
    config: RunnableConfig,
    _options?: CheckpointListOptions,
  ): AsyncGenerator<CheckpointTuple> {
    const tuple = await this.getTuple(config);
    if (tuple) yield tuple;
  }

  /**
   * Delete all checkpoints for a thread.
   */
  async deleteThread(threadId: string): Promise<void> {
    const keys = await this.client.keys(`${this.keyPrefix}:checkpoint:${threadId}:*`);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
    await this.client.del(latestPointerKey(this.keyPrefix, threadId));
  }
}

export function getCheckpointer() {
  try {
    return new UpstashRestCheckpointer();
  } catch (error) {
    const isProductionBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
    const isCiRuntime = process.env.CI === "true";
    if (isProductionEnv() && !isProductionBuildPhase && !isCiRuntime) {
      console.error(
        JSON.stringify({
          component: "vanguard.agent.checkpointer",
          level: "error",
          event: "production_checkpointer_init_failed",
          detail: error instanceof Error ? error.message.slice(0, 120) : "unknown",
        }),
      );
      throw error;
    }
    console.warn(
      JSON.stringify({
        component: "vanguard.agent.checkpointer",
        level: "warn",
        event: isProductionBuildPhase
          ? "production_build_checkpointer_deferred"
          : isCiRuntime
            ? "ci_runtime_checkpointer_deferred"
            : "degraded_checkpointer_disabled",
        detail: error instanceof Error ? error.message.slice(0, 120) : "unknown",
      }),
    );
    return undefined;
  }
}
