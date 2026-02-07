const redirects = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header',
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // Redirect root to /oms dashboard
  const rootRedirect = {
    source: '/',
    destination: '/oms',
    permanent: false,
  }

  const redirects = [internetExplorerRedirect, rootRedirect]

  return redirects
}

export default redirects
