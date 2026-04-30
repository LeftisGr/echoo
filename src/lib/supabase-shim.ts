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

async function refreshSession(baseUrl: string, key: string, session: StoredSession) {
  const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
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
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
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

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  maybeSingle() {
    return this.execute(true, false);
  }

  single() {
    return this.execute(true, true);
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(single = false, strictSingle = false): Promise<any> {
    const session = await ensureValidSession(this.url, this.key, this.session ?? readSession());
    const headers: Record<string, string> = {
      apikey: this.key,
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await this.performRequest(headers);

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401 && errorText.includes("JWT expired") && session?.refresh_token) {
        const refreshed = await refreshSession(this.url, this.key, session);
        if (refreshed?.access_token) {
          headers.Authorization = `Bearer ${refreshed.access_token}`;
          const retry = await this.performRequest(headers);
          if (!retry.ok) {
            throw new Error(await retry.text());
          }
          return this.readResponse(retry, single, strictSingle);
        }
      }

      throw new Error(errorText);
    }

    return this.readResponse(response, single, strictSingle);
  }

  private async performRequest(headers: Record<string, string>) {
    if (this.method === "insert" || this.method === "upsert" || this.method === "update") {
      const method = this.method === "update" ? "PATCH" : "POST";
      return fetch(`${this.url}/rest/v1/${this.table}`, {
        method,
        headers: {
          ...headers,
          Prefer: `${this.useMerge ? "resolution=merge-duplicates," : ""}return=representation`,
        },
        body: JSON.stringify(this.payload),
      });
    }

    const requestUrl = new URL(`${this.url}/rest/v1/${this.table}`);
    requestUrl.searchParams.set("select", this.selectColumns);
    this.filters.forEach((filter) => {
      const [key, value] = filter.split("=");
      requestUrl.searchParams.append(key, value);
    });
    if (this.inClause) {
      const [key, value] = this.inClause.split("=");
      requestUrl.searchParams.append(key, value);
    }
    if (this.orClause) {
      requestUrl.searchParams.append("or", `(${this.orClause})`);
    }
    if (this.orderClause) {
      const [column, direction] = this.orderClause.split(".");
      requestUrl.searchParams.append("order", `${column}.${direction}`);
    }
    if (this.limitValue !== null) {
      requestUrl.searchParams.append("limit", String(this.limitValue));
    }

    return fetch(requestUrl.toString(), {
      method: "GET",
      headers,
    });
  }

  private async readResponse(response: Response, single: boolean, strictSingle: boolean) {
    if (this.method === "insert" || this.method === "upsert" || this.method === "update") {
      const data = await response.json();
      return { data, error: null };
    }

    const raw = (await response.json()) as any[];
    const data = single ? (strictSingle ? raw[0] ?? null : raw[0] ?? null) : raw;
    if (this.head || this.countExact) {
      return { data, count: raw.length, error: null };
    }
    return { data, error: null };
  }
}

class ChannelShim {
  on() {
    return this;
  }

  subscribe() {
    return this;
  }

  unsubscribe() {
    return Promise.resolve();
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
    async signInWithOtp({ email, options }: { email: string; options?: { emailRedirectTo?: string } }) {
      const verifier = getUrlSafeRandom(64);
      const challenge = await sha256(verifier);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
      }
      const response = await fetch(`${url}/auth/v1/otp`, {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          create_user: true,
          code_challenge: challenge,
          code_challenge_method: "s256",
          email_redirect_to: options?.emailRedirectTo,
        }),
      });
      if (!response.ok) {
        return { data: null, error: new Error(await response.text()) };
      }
      return { data: { email }, error: null };
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
            const headers: Record<string, string> = {
              apikey: key,
              "Content-Type": "application/json",
            };
            if (session?.access_token) {
              headers.Authorization = `Bearer ${session.access_token}`;
            }
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
    channel() {
      return new ChannelShim();
    },
  };
}