// Instagram API with Facebook Login (graph.facebook.com), called with the Page access token
// of the Facebook Page linked to the Instagram professional account.

const VERSION = process.env.META_GRAPH_API_VERSION || "v25.0";
const BASE = `https://graph.facebook.com/${VERSION}`;

export class GraphError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Graph API ${status}`);
    this.status = status;
    this.code = body?.error?.code;
    this.subcode = body?.error?.error_subcode;
  }
}

async function call(method, path, token, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  const init = { method, headers: { Authorization: `Bearer ${token}` } };
  if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(params);
  }
  const res = await fetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new GraphError(res.status, body);
  return body;
}

// The system-user token lists the Pages it was given; take the one linked to our IG account.
export async function pageTokenFor(systemToken, igUserId) {
  const { data = [] } = await call("GET", "me/accounts", systemToken, {
    fields: "id,name,access_token,instagram_business_account",
    limit: "100",
  });
  const page = data.find((p) => p.instagram_business_account?.id === igUserId);
  if (!page) throw new Error(`No Page linked to Instagram account ${igUserId} is assigned to this token`);
  return { pageId: page.id, pageName: page.name, token: page.access_token };
}

// Follow `paging.next` until `keepGoing(page)` is false or pages run out.
async function paged(token, path, params, keepGoing, maxPages = 20) {
  const out = [];
  let body = await call("GET", path, token, params);
  for (let i = 0; i < maxPages; i++) {
    const data = body.data || [];
    out.push(...data);
    const next = body.paging?.next;
    if (!next || !data.length || !keepGoing(data)) break;
    const res = await fetch(next, { headers: { Authorization: `Bearer ${token}` } });
    body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) throw new GraphError(res.status, body);
  }
  return out;
}

// Media published at or after `sinceMs`, newest first.
export async function mediaSince(token, igUserId, sinceMs) {
  const all = await paged(
    token,
    `${igUserId}/media`,
    { fields: "id,caption,timestamp,permalink,comments_count", limit: "25" },
    (page) => Date.parse(page[page.length - 1].timestamp) >= sinceMs,
  );
  return all.filter((m) => Date.parse(m.timestamp) >= sinceMs);
}

// All top-level comments newer than `sinceMs` (the API returns newest first).
export async function commentsSince(token, mediaId, sinceMs) {
  const all = await paged(
    token,
    `${mediaId}/comments`,
    { fields: "id,text,timestamp,username,from{id,username},replies{id,username,from{id,username}}", limit: "50" },
    (page) => Date.parse(page[page.length - 1].timestamp) >= sinceMs,
  );
  return all.filter((c) => Date.parse(c.timestamp) >= sinceMs);
}

export const sendPrivateReply = (token, igUserId, commentId, text) =>
  call("POST", `${igUserId}/messages`, token, { recipient: { comment_id: commentId }, message: { text } });

export const postPublicReply = (token, commentId, message) =>
  call("POST", `${commentId}/replies`, token, { message });
