type AuthChangeHandler = (event: string, session: StoredSession | null) => void;

type StoredSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  token_type: string;
  user: {
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
};

const SESSION_KEY = "presence-supabase-session";
const PKCE_VERIFIER_KEY = "presence-supabase-pkce-verifier";
const GUEST_EMAIL_KEY = "presence-supabase-guest-email";
const GUEST_PASSWORD_KEY = "presence-supabase-guest-password";
const listeners = new Set<AuthChangeHandler>();

function getUrlSafeRandom(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function readSession(): StoredSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function writeSession(session: StoredSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

function emit(event: string, session: StoredSession | null) {
  listeners.forEach((listener) => listener(event, session));
}

function isSessionExpired(session: StoredSession | null) {
  return Boolean(session && session.expires_at * 1000 <= Date.now());
}

function readGuestCredentials() {
  if (typeof window === "undefined") {
    return null;
  }

  const email = window.localStorage.getItem(GUEST_EMAIL_KEY);
  const password = window.localStorage.getItem(GUEST_PASSWORD_KEY);
  if (!email || !password) {
    return null;
  }

  return { email, password };
}

function writeGuestCredentials(credentials: { email: string; password: string } | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!credentials) {
    window.localStorage.removeItem(GUEST_EMAIL_KEY);
    window.localStorage.removeItem(GUEST_PASSWORD_KEY);
    return;
  }

  window.localStorage.setItem(GUEST_EMAIL_KEY, credentials.email);
  window.localStorage.setItem(GUEST_PASSWORD_KEY, credentials.password);
}

function createAuthHeaders(key: string, accessToken?: string | null) {
  return {
    apikey: key,
    Authorization: `Bearer ${accessToken ?? key}`,
    "Content-Type": "application/json",
  };
}

function createGuestCredentials() {
  const token = getUrlSafeRandom(16).toLowerCase();
  return {
    email: `guest-${token}@presence.local`,
    password: getUrlSafeRandom(32),
  };
}

async function invokeEdgeFunction(baseUrl: string, key: string, name: string, body?: unknown) {
  const response = await fetch(`${baseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: createAuthHeaders(key),
    body: JSON.stringify(body ?? {}),
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

async function persistAuthResponse(response: Response) {
  if (!response.ok) {
    return { session: null, errorText: await response.text() };
  }

  const data = await response.json();
  const session = (data?.session ?? data) as StoredSession | null;
  if (session?.access_token) {
    writeSession(session);
    emit("SIGNED_IN", session);
    return { session, errorText: null };
  }

  return { session: null, errorText: null };
}

async function refreshSession(baseUrl: string, key: string, session: StoredSession) {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: createAuthHeaders(key, key),
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });

  if (!response.ok) {
    return null;
  }

  const refreshed = (await response.json()) as StoredSession;
  writeSession(refreshed);
  emit("TOKEN_REFRESHED", refreshed);
  return refreshed;
}

async function ensureValidSession(baseUrl: string, key: string, session: StoredSession | null) {
  if (!session) {
    return null;
  }

  if (!isSessionExpired(session)) {
    return session;
  }

  const refreshed = await refreshSession(baseUrl, key, session);
  if (refreshed) {
    return refreshed;
  }

  writeSession(null);
  emit("SIGNED_OUT", null);
  return null;
}

async function exchangeCodeForSession(baseUrl: string, key: string, code: string) {
  const verifier = window.localStorage.getItem(PKCE_VERIFIER_KEY);
  if (!verifier) {
    return null;
  }

  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=pkce`, {
    method: "POST",
    headers: createAuthHeaders(key, key),
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
  });

  if (!response.ok) {
    return null;
  }

  const session = (await response.json()) as StoredSession;
  window.localStorage.removeItem(PKCE_VERIFIER_KEY);
  writeSession(session);
  emit("SIGNED_IN", session);
  return session;
}

async function getInitialSession(baseUrl: string, key: string) {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if (code) {
    const session = await exchangeCodeForSession(baseUrl, key, code);
    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
    if (session) {
      return session;
    }
  }

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  const expiresIn = hash.get("expires_in");
  const tokenType = hash.get("token_type");
  const userRaw = hash.get("user");

  if (accessToken && refreshToken && expiresIn && tokenType && userRaw) {
    try {
      const user = JSON.parse(decodeURIComponent(userRaw)) as StoredSession["user"];
      const session: StoredSession = {
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: Math.floor(Date.now() / 1000) + Number(expiresIn),
        token_type: tokenType,
        user,
      };
      writeSession(session);
      emit("SIGNED_IN", session);
      url.hash = "";
      window.history.replaceState({}, document.title, url.pathname + url.search);
      return session;
    } catch {
      // ignore malformed hash
    }
  }

  return readSession();
}

class QueryBuilder {
  private readonly url: string;
  private readonly key: string;
  private readonly session: StoredSession | null;
  private readonly table: string;
  private selectColumns = "*";
  private head = false;
  private filters: string[] = [];
  private orderClause: string | null = null;
  private limitValue: number | null = null;
  private orClause: string | null = null;
  private inClause: string | null = null;
  private countExact = false;
  private method: "select" | "insert" | "upsert" | "update" = "select";

  private payload: unknown = null;
  private useMerge = false;

  constructor(url: string, key: string, table: string, session: StoredSession | null) {
    this.url = url;
    this.key = key;
    this.table = table;
    this.session = session;
  }

  select(columns = "*", options?: { head?: boolean; count?: string }) {
    this.selectColumns = columns;
    this.head = Boolean(options?.head);
    this.countExact = options?.count === "exact";
    return this;
  }

  insert(payload: unknown) {
    this.method = "insert";
    this.payload = payload;
    return this;
  }

  upsert(payload: unknown) {
    this.method = "upsert";
    this.payload = payload;
    this.useMerge = true;
    return this;
  }

  update(payload: unknown) {
    this.method = "update";
    this.payload = payload;
    return this;
  }

  eq(column: string, value: string | number | boolean | null) {
    this.filters.push(`${column}=eq.${encodeURIComponent(String(value))}`);
    return this;
  }

  neq(column: string, value: string | number | boolean | null) {
    this.filters.push(`${column}=neq.${encodeURIComponent(String(value))}`);
    return this;
  }

  is(column: string, value: null | boolean | string) {
    this.filters.push(`${column}=is.${value === null ? "null" : encodeURIComponent(String(value))}`);
    return this;
  }

  in(column: string, values: string[]) {
    this.inClause = `${column}=in.(${values.map((value) => encodeURIComponent(value)).join(",")})`;
    return this;
  }

  or(clause: string) {
    this.orClause = clause;
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderClause = `${column}.${options?.ascending === false ? "desc" : "asc"}`;
    return this;
  }

  limit(count: number) {
    this.limitValue = count;
    return this;
  }

  maybeSingle() {
    return this.execute(true);
  }

  single() {
    return this.execute(true);
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(expectSingle = false) {
    const session = await ensureValidSession(this.url, this.key, this.session ?? readSession());
    const headers: Record<string, string> = createAuthHeaders(this.key, session?.access_token);

    const url = new URL(`${this.url}/rest/v1/${this.table}`);
    if (this.method === "select") {
      url.searchParams.set("select", this.selectColumns);
    }
    for (const filter of this.filters) {
      const [column, condition] = filter.split("=");
      url.searchParams.append(column, condition);
    }
    if (this.orClause) {
      url.searchParams.append("or", `(${this.orClause})`);
    }
    if (this.inClause) {
      const [column, values] = this.inClause.split("=");
      url.searchParams.append(column, values);
    }
    if (this.orderClause) {
      url.searchParams.set("order", this.orderClause);
    }
    if (this.limitValue !== null) {
      url.searchParams.set("limit", String(this.limitValue));
    }

    const method = this.method === "select" ? "GET" : this.method === "insert" ? "POST" : this.method === "upsert" ? "POST" : "PATCH";
    const response = await fetch(url.toString(), {
      method,
      headers: {
        ...headers,
        ...(this.method === "upsert" ? { Prefer: `resolution=${this.useMerge ? "merge-duplicates" : "ignore-duplicates"}` } : {}),
      },
      body: this.method === "select" ? undefined : JSON.stringify(this.payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const responseText = await response.text();
    const data = responseText ? JSON.parse(responseText) : null;

    if (expectSingle) {
      return { data: Array.isArray(data) ? data[0] ?? null : data, error: null };
    }

    return { data: this.head ? null : data, error: null };

  }
}

class ChannelShim {
  constructor(_topic: string, _key?: string) {}
  on(..._args: unknown[]) {
    return this;
  }
  subscribe(_callback?: (status: string) => void) {
    return this;
  }
  unsubscribe() {
    return Promise.resolve();
  }
  track(_payload?: unknown) {
    return Promise.resolve();
  }
  untrack() {
    return Promise.resolve();
  }
  send(_payload?: unknown) {
    return Promise.resolve({});
  }
  presenceState() {
    return {};
  }
}

export function createClient(url: string, key: string) {
  let currentSession: StoredSession | null = readSession();

  const auth = {
    async getSession() {
      currentSession = currentSession ?? (await getInitialSession(url, key));
      currentSession = await ensureValidSession(url, key, currentSession);
      return { data: { session: currentSession }, error: null };
    },
    onAuthStateChange(callback: AuthChangeHandler) {
      listeners.add(callback);
      void auth.getSession().then(({ data }) => callback("INITIAL_SESSION", data.session));
      return {
        data: {
          subscription: {
            unsubscribe() {
              listeners.delete(callback);
            },
          },
        },
      };
    },
    async signInWithOAuth({ provider, options }: { provider: string; options?: { redirectTo?: string } }) {
      const verifier = getUrlSafeRandom(64);
      const challenge = await sha256(verifier);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
        const authUrl = new URL(`${url}/auth/v1/authorize`);
        authUrl.searchParams.set("provider", provider);
        if (options?.redirectTo) {
          authUrl.searchParams.set("redirect_to", options.redirectTo);
        }
        authUrl.searchParams.set("code_challenge", challenge);
        authUrl.searchParams.set("code_challenge_method", "s256");
        window.location.href = authUrl.toString();
      }
      return { data: { provider }, error: null };
    },
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      const response = await fetch(`${url}/auth/v1/signup`, {
        method: "POST",
        headers: createAuthHeaders(key, key),
        body: JSON.stringify({
          email,
          password,
          data: options?.data ?? {},
        }),
      });

      const { session, errorText } = await persistAuthResponse(response);
      if (session) {
        return { data: { session }, error: null };
      }

      return { data: null, error: errorText ? new Error(errorText) : null };
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: createAuthHeaders(key, key),
        body: JSON.stringify({ email, password }),
      });

      const { session, errorText } = await persistAuthResponse(response);
      if (session) {
        return { data: { session }, error: null };
      }

      return { data: null, error: errorText ? new Error(errorText) : null };
    },
    async signInAnonymously() {
      writeGuestCredentials(null);

      const { response, data } = await invokeEdgeFunction(url, key, "guest-bootstrap");

      if (!response.ok) {
        return {
          data: null,
          error: new Error(typeof data === "string" ? data : JSON.stringify(data ?? {})),
        };
      }

      const nextSession = (data as { session?: StoredSession | null } | null)?.session ?? null;
      const nextCredentials = data as { email?: string; password?: string } | null;

      if (nextCredentials?.email && nextCredentials.password) {
        writeGuestCredentials({ email: nextCredentials.email, password: nextCredentials.password });
      }

      if (nextSession?.access_token) {
        writeSession(nextSession);
        emit("SIGNED_IN", nextSession);
        return { data: { session: nextSession }, error: null };
      }

      return {
        data: null,
        error: new Error("Guest bootstrap did not return a session."),
      };
    },

    async signOut() {
      currentSession = null;
      writeSession(null);
      emit("SIGNED_OUT", null);
      return { error: null };
    },
  };

  return {
    auth,
    from(table: string) {
      return new QueryBuilder(url, key, table, currentSession);
    },
    rpc(fnName: string, params?: Record<string, unknown>) {
      return {
        then<TResult1 = any, TResult2 = never>(
          onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          const run = async () => {
            const session = await ensureValidSession(url, key, currentSession ?? readSession());
            const headers: Record<string, string> = createAuthHeaders(key, session?.access_token);

            const response = await fetch(`${url}/rest/v1/rpc/${fnName}`, {
              method: "POST",
              headers,
              body: JSON.stringify(params ?? {}),
            });
            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(errorText);
            }
            const data = await response.json();
            return { data, error: null };
          };
          return run().then(onfulfilled, onrejected);
        },
      };
    },
    functions: {
      async invoke(functionName: string, options?: { body?: unknown }) {
        const session = await ensureValidSession(url, key, currentSession ?? readSession());
        const headers: Record<string, string> = createAuthHeaders(key, session?.access_token);

        const response = await fetch(`${url}/functions/v1/${functionName}`, {
          method: "POST",
          headers,
          body: JSON.stringify(options?.body ?? {}),
        });
        const text = await response.text();
        const data = text ? JSON.parse(text) : null;
        return { data, error: response.ok ? null : new Error(typeof data === "string" ? data : JSON.stringify(data ?? {})) };
      },
    },
    channel(topic?: string, options?: { config?: { presence?: { key?: string }; broadcast?: { self?: boolean; ack?: boolean } } }) {
      return new ChannelShim(topic ?? "default", options?.config?.presence?.key);
    },
  };
}