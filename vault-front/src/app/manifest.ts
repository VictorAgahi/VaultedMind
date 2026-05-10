import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VaultedMind',
    short_name: 'VaultedMind',
    description: 'Sécurisez votre bien-être mental',
    start_url: '/',
    display: 'standalone',
    background_color: '#ede5d9',
    theme_color: '#d81832',
    icons: [
      {
        src: '/assets/logo.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/assets/logo.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
