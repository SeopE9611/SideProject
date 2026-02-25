export function isAdminNavActive(pathname: string, href: string): boolean {
  const path = pathname || '';

  if (href === '/admin/dashboard') {
    return path === '/admin' || path === '/admin/dashboard' || path.startsWith('/admin/dashboard/');
  }

  if (path === href) return true;

  const withSlash = href.endsWith('/') ? href : `${href}/`;
  const under = path.startsWith(withSlash);

  if (href === '/admin/packages') {
    if (/^\/admin\/packages\/settings(?:\/|$)/.test(path)) return false;
    return under;
  }

  if (href === '/admin/settings') {
    if (path.startsWith('/admin/settings/')) return false;
    return under;
  }

  return under;
}
