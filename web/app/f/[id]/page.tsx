import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Site from '../../site-ui'
import { FLOWERS } from '../../../lib/site-data'

// Reads the flower id at request time for ids outside generateStaticParams (and gives
// unknown ids a real 404), as the login and profile pages do. The three known flowers
// are still prerendered.
export const instant = false

// The NFC tag on each statue points at /f/<id>, the same path the mobile app handles.
export function generateStaticParams() {
  return FLOWERS.map((f) => ({ id: f.id }))
}

export async function generateMetadata({ params }: PageProps<'/f/[id]'>): Promise<Metadata> {
  const { id } = await params
  const flower = FLOWERS.find((f) => f.id === id)
  if (!flower) return {}
  return { title: `${flower.name.en} · TimiSight`, description: flower.about.en }
}

export default async function Page({ params }: PageProps<'/f/[id]'>) {
  const { id } = await params
  if (!FLOWERS.some((f) => f.id === id)) notFound()
  return <Site flowerId={id} />
}
