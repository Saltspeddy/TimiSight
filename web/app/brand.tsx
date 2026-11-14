import Image from 'next/image'
import Link from 'next/link'

// Logo + name used at the top of the account pages (login, signup, profile, play).
export function BrandLink({ className }: { className: string }) {
  return (
    <Link className={className} href="/">
      <Image src="/logo.png" alt="" width={32} height={32} />
      TimiSight
    </Link>
  )
}
