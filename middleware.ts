// Vercel Edge Middleware: HTTP Basic Auth sull'intera app.
// Se APP_PASSWORD non è impostata (es. in dev), lascia passare tutto.
// Esclude /api/ così il callback OAuth Strava funziona anche senza header.
import { next } from "@vercel/edge";

export const config = {
  matcher: "/((?!api/).*)",
};

export default function middleware(request: Request) {
  const user = process.env.APP_USERNAME ?? "samu";
  const pass = process.env.APP_PASSWORD ?? "";

  if (!pass) return next();

  const auth = request.headers.get("authorization") ?? "";
  const expected = "Basic " + btoa(`${user}:${pass}`);
  if (auth === expected) return next();

  return new Response("Area privata — autenticazione richiesta", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Allenamenti", charset="UTF-8"',
      "Content-Type": "text/plain; charset=UTF-8",
      "Cache-Control": "no-store",
    },
  });
}
