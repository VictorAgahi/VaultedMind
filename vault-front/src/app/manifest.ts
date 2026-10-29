import { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'VaultedMind',
    short_name: 'VaultedMind',
    description: 'Sécurisez votre bien-être mental',
    start_url: '/',
    display: 'standalone',
    background_color: '#F3F4F1',
    theme_color: '#1E5B53',
    icons: [
      {
        src: '/icon.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/assets/logo.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
