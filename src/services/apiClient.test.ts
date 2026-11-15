import axios, {
  AxiosAdapter,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, authEventEmitter } from "./apiClient";

// Minimal localStorage, since the tests run in Node, not a browser
class MemoryStorage {
  private items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, String(value));
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
  clear() {
    this.items.clear();
  }
}

const api = apiClient.getAxiosInstance();
const originalAdapter = api.defaults.adapter;

// Answers each request with the next status in the list (200 once they run
// out) and records the Authorization header every request carried
const sentTokens: (string | undefined)[] = [];
const respondWith =
  (...statuses: number[]): AxiosAdapter =>
  async (config: InternalAxiosRequestConfig) => {
    sentTokens.push(config.headers.Authorization as string | undefined);
    const status = statuses.shift() ?? 200;
    const response: AxiosResponse = {
      data: status < 400 ? { ok: true } : { error: `status ${status}` },
      status,
      statusText: "",
      headers: {},
      config,
    };
    if (status >= 400) {
      throw new AxiosError(
        `Request failed with status code ${status}`,
        String(status),
        config,
        null,
        response,
      );
    }
    return response;
  };

let storage: MemoryStorage;
const onLogout = vi.fn();
let unsubscribe: () => void;

beforeEach(() => {
  storage = new MemoryStorage();
  storage.setItem("token", "old-token");
  storage.setItem("refreshToken", "old-refresh");
  storage.setItem("userId", "user-1");
  vi.stubGlobal("localStorage", storage);
  sentTokens.length = 0;
  onLogout.mockClear();
  unsubscribe = authEventEmitter.subscribe(onLogout);
});

afterEach(() => {
  unsubscribe();
  api.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("apiClient response handling", () => {
  it.each([403, 500, 400, 404, 429])(
    "keeps the user signed in on %i and passes the error on",
    async (status) => {
      api.defaults.adapter = respondWith(status);
      const refresh = vi.spyOn(axios, "post");

      await expect(api.get("/conversations")).rejects.toMatchObject({
        response: { status },
      });
      expect(onLogout).not.toHaveBeenCalled();
      expect(storage.getItem("token")).toBe("old-token");
      expect(refresh).not.toHaveBeenCalled();
    },
  );

  it("refreshes on 401 and retries the request with the new token", async () => {
    api.defaults.adapter = respondWith(401, 200);
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { token: "new-token", refreshToken: "new-refresh" },
    });

    const response = await api.get("/conversations");

    expect(response.status).toBe(200);
    expect(sentTokens).toEqual(["Bearer old-token", "Bearer new-token"]);
    expect(onLogout).not.toHaveBeenCalled();
  });

  it("logs out when a 401 cannot be fixed by a refresh", async () => {
    api.defaults.adapter = respondWith(401);
    vi.spyOn(axios, "post").mockRejectedValue(new Error("refresh rejected"));

    await expect(api.get("/conversations")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(storage.getItem("token")).toBeNull();
    expect(storage.getItem("refreshToken")).toBeNull();
  });

  it("logs out when the retried request is still 401", async () => {
    api.defaults.adapter = respondWith(401, 401);
    vi.spyOn(axios, "post").mockResolvedValue({
      data: { token: "new-token", refreshToken: "new-refresh" },
    });

    await expect(api.get("/conversations")).rejects.toMatchObject({
      response: { status: 401 },
    });
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it("treats a 401 from login as a wrong password, not a lost session", async () => {
    api.defaults.adapter = respondWith(401);
    const refresh = vi.spyOn(axios, "post");

    await expect(
      api.post("/auth/login", { username: "u", password: "wrong" }),
    ).rejects.toMatchObject({ response: { status: 401 } });
    expect(refresh).not.toHaveBeenCalled();
    expect(onLogout).not.toHaveBeenCalled();
  });
});
