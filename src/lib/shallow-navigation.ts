/**
 * Change the query string without a server round trip.
 *
 * `router.push`/`replace` re-render the page on the server even when only the
 * search params change, and hold the URL back until that payload arrives. For
 * a param the server never reads - a selected pane, a one-shot deep-link flag -
 * that is a wait for an identical response. Next integrates the native history
 * API, so `useSearchParams` still updates and the back button still works.
 *
 * Builds on `window.location.pathname` rather than a router pathname: that is
 * the URL the browser shows, with its locale prefix and before any proxy
 * rewrite.
 */
export function setSearchParams(
  update: (params: URLSearchParams) => void,
  mode: 'push' | 'replace' = 'push',
) {
  const params = new URLSearchParams(window.location.search);
  update(params);
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  if (mode === 'push') window.history.pushState(null, '', url);
  else window.history.replaceState(null, '', url);
}
