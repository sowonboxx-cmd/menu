// beltab.com est l'adresse principale : beltab.fr et www.beltab.com y renvoient (redirection permanente).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname !== 'beltab.com' && (url.hostname.endsWith('beltab.fr') || url.hostname === 'www.beltab.com')) {
      url.hostname = 'beltab.com';
      url.protocol = 'https:';
      url.port = '';
      return Response.redirect(url.toString(), 301);
    }
    return env.ASSETS.fetch(request);
  },
};
