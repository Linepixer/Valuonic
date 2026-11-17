const SITE_NAME = 'Valuonic';
// Kept identical to index.html so the landing title doesn't change after hydration.
const HOME_TITLE = 'Valuonic - Invertí con claridad';

const STATIC_TITLES = {
  '/login': 'Iniciar sesión',
  '/signup': 'Registrarse',
  '/forgot-password': 'Recuperar contraseña',
  '/reset-password': 'Restablecer contraseña',
  '/about': 'Acerca de',
  '/terms': 'Términos de Servicio',
  '/privacy': 'Política de Privacidad',
  '/portfolio': 'Portafolio',
  '/market': 'Cotizaciones',
  '/transactions': 'Transacciones',
  '/transactions/import': 'Importar transacciones',
  '/account': 'Mi cuenta',
  '/account/delete-confirm': 'Eliminar cuenta',
  '/admin': 'Administración',
  '/admin/delete-account': 'Eliminar cuenta',
};

const TICKER_ROUTES = [
  /^\/portfolio\/possession\/([^/]+)\/?$/,
  /^\/asset\/([^/]+)\/?$/,
];

export function getPageTitle(pathname) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  if (STATIC_TITLES[path]) return `${STATIC_TITLES[path]} | ${SITE_NAME}`;

  for (const pattern of TICKER_ROUTES) {
    const match = path.match(pattern);
    if (match) return `${decodeURIComponent(match[1]).toUpperCase()} | ${SITE_NAME}`;
  }

  return HOME_TITLE;
}
