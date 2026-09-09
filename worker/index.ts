interface Env {
  ASSETS: Fetcher;
}

const BASE_PATH = "/epiclearningpro";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === BASE_PATH) {
      url.pathname = "/";
    } else if (url.pathname.startsWith(`${BASE_PATH}/`)) {
      url.pathname = url.pathname.slice(BASE_PATH.length);
    } else {
      return new Response("Not found", { status: 404 });
    }

    return env.ASSETS.fetch(new Request(url, request));
  },
};
