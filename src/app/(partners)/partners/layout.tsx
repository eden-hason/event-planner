/**
 * The Partners app, served from partners.kulu-lu.com.
 *
 * src/proxy.ts rewrites that host onto /partners, so every path here is
 * reached one segment shorter than it is written: partners.kulu-lu.com/ is
 * this route group's root.
 *
 * Local development uses http://partners.localhost:3000, which browsers
 * resolve to 127.0.0.1 without any hosts-file entry, so the rewrite under test
 * is the same one production runs. Reaching /partners by path still works, but
 * links here are host-relative - a redirect to "/" is this app's root only on
 * the Partners host - so the subdomain is the supported way in.
 *
 * There is no locale segment above this layout, so the root layout's default
 * (he, RTL) applies. Whether the Partners app ever needs the main app's
 * next-intl routing is a decision for when it has copy worth translating.
 */
export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
