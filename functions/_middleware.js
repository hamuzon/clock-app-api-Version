export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname.endsWith(".")) {
    url.hostname = url.hostname.slice(0, -1);
    return Response.redirect(url.toString(), 308);
  }

  return context.next();
}
