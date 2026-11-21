import { createStorage } from "unstorage";
import lruCacheDriver from "unstorage/drivers/lru-cache";

/**
 * Server-side records of the storefront's visitor sessions (ADR 0001,
 * step 4). The browser holds only the record's id; the record holds what
 * each adapter needs to recognise the visitor (Shopware: the context
 * token), as an opaque string per adapter name.
 */
export type SessionRecord = Readonly<{
  v: 1;
  /** Adapter name → the adapter's opaque state. */
  states: Readonly<Record<string, string>>;
  /** ms since the epoch */
  createdAt: number;
  touchedAt: number;
  /**
   * The record was replaced by a new id (the backend changed its state):
   * the old id knows nothing any more and is never revived.
   */
  moved?: true;
}>;

/** The part of an unstorage `Storage` the session store uses. */
export interface SessionStorage {
  getItem(key: string): Promise<unknown>;
  setItem(
    key: string,
    value: SessionRecord,
    options?: { ttl?: number },
  ): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface SessionStore {
  readonly maxAgeSeconds: number;
  /** The live record of an id; null if unknown, expired or moved. */
  get(id: string): Promise<SessionRecord | null>;
  /** A live or moved record (a moved one tells writes to stay away). */
  load(id: string): Promise<SessionRecord | null>;
  create(states: Readonly<Record<string, string>>): Promise<string>;
  save(id: string, record: SessionRecord): Promise<void>;
  /** Replaces the record under a new id; the old id is marked moved. */
  move(id: string, record: SessionRecord): Promise<string>;
  remove(id: string): Promise<void>;
  /**
   * Runs `task` after every task of the same id that started before it
   * (in this process). Writes of one visitor never interleave.
   */
  exclusive<T>(id: string, task: () => Promise<T>): Promise<T>;
  now(): number;
}

/** 32 random bytes, base64url: 43 characters. */
export const SESSION_ID = /^[A-Za-z0-9_-]{43}$/;

export function randomSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/** How long a moved id is remembered: requests still in flight. */
const MOVED_SECONDS = 300;

function isRecord(value: unknown): value is SessionRecord {
  const record = value as SessionRecord | null;
  return (
    !!record &&
    typeof record === "object" &&
    record.v === 1 &&
    typeof record.states === "object" &&
    record.states !== null &&
    Object.values(record.states).every((state) => typeof state === "string") &&
    typeof record.createdAt === "number" &&
    typeof record.touchedAt === "number"
  );
}

export function createSessionStore(options: {
  storage: SessionStorage;
  maxAgeSeconds: number;
  now?: () => number;
  newId?: () => string;
}): SessionStore {
  const { storage, maxAgeSeconds } = options;
  const now = options.now ?? Date.now;
  const newId = options.newId ?? randomSessionId;
  const locks = new Map<string, Promise<unknown>>();

  const key = (id: string) => `s:${id}`;

  async function load(id: string): Promise<SessionRecord | null> {
    if (!SESSION_ID.test(id)) return null;
    const value = await storage.getItem(key(id));
    if (!isRecord(value)) return null;
    // storages without a TTL (fs) keep expired records
    const ageSeconds = (now() - value.touchedAt) / 1000;
    const limit = value.moved ? MOVED_SECONDS : maxAgeSeconds;
    return ageSeconds > limit ? null : value;
  }

  async function save(id: string, record: SessionRecord): Promise<void> {
    await storage.setItem(key(id), record, {
      ttl: record.moved ? MOVED_SECONDS : maxAgeSeconds,
    });
  }

  async function create(
    states: Readonly<Record<string, string>>,
  ): Promise<string> {
    const id = newId();
    const at = now();
    await save(id, { v: 1, states, createdAt: at, touchedAt: at });
    return id;
  }

  return {
    maxAgeSeconds,
    now,
    load,
    get: async (id) => {
      const record = await load(id);
      return record && !record.moved ? record : null;
    },
    create,
    save,
    move: async (id, record) => {
      const next = await create(record.states);
      await save(id, {
        v: 1,
        states: {},
        createdAt: record.createdAt,
        touchedAt: now(),
        moved: true,
      });
      return next;
    },
    remove: async (id) => {
      await storage.removeItem(key(id));
    },
    exclusive: <T>(id: string, task: () => Promise<T>): Promise<T> => {
      const before = locks.get(id) ?? Promise.resolve();
      const run = before.then(task, task);
      const settled = run.then(
        () => {},
        () => {},
      );
      locks.set(id, settled);
      void settled.then(() => {
        if (locks.get(id) === settled) locks.delete(id);
      });
      return run;
    },
  };
}

/**
 * The default storage: an LRU in this process with at most `maxEntries`
 * sessions, each for `maxAgeSeconds` after its last write. Lost on a
 * restart; a shop with several instances (or that keeps carts over a
 * deploy) mounts its own `shopbite-session` storage (e.g. Redis).
 */
export function memorySessionStorage(options: {
  maxEntries: number;
  maxAgeSeconds: number;
}): SessionStorage {
  return createStorage({
    driver: lruCacheDriver({
      max: options.maxEntries,
      ttl: options.maxAgeSeconds * 1000,
    }),
  }) as unknown as SessionStorage;
}
