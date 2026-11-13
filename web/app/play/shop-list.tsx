'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { listOffers, getMyPoints, redeemOffer } from '@/lib/shop-db'
import type { OfferRow, UserPoints } from '@/lib/shop'

/**
 * Shop column for the combined /play page. Anyone can view offers; redeeming
 * requires sign-in (the redeem_offer RPC checks auth.uid()). Loads offers +
 * balance on mount and refreshes after a successful redeem.
 */

type RedeemState = { code: string } | { error: string } | undefined

export default function ShopList() {
  const [sb] = useState(() => createClient())
  const [signedIn, setSignedIn] = useState<boolean | null>(null)
  const [points, setPoints] = useState<UserPoints | null>(null)
  const [offers, setOffers] = useState<OfferRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, RedeemState>>({})

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [{ data: { user } }, list, pts] = await Promise.all([
          sb.auth.getUser(),
          listOffers(sb),
          getMyPoints(sb),
        ])
        if (!active) return
        setSignedIn(!!user)
        setOffers(list)
        setPoints(pts)
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => { active = false }
  }, [sb])

  const friendly = (msg: string) => {
    if (msg.includes('not enough points')) return 'Not enough points'
    if (msg.includes('sold out')) return 'Sold out'
    if (msg.includes('not signed in')) return 'Sign in to redeem'
    return msg
  }

  const onRedeem = async (offer: OfferRow) => {
    setBusy(offer.id)
    setResults((r) => ({ ...r, [offer.id]: undefined }))
    const res = await redeemOffer(sb, offer.id)
    if (res.ok) {
      setResults((r) => ({ ...r, [offer.id]: { code: res.code } }))
      const pts = await getMyPoints(sb)
      if (pts) setPoints(pts)
      setOffers((list) =>
        (list ?? []).map((o) =>
          o.id === offer.id && o.stock !== null ? { ...o, stock: o.stock - 1 } : o
        )
      )
    } else {
      setResults((r) => ({ ...r, [offer.id]: { error: friendly(res.error) } }))
    }
    setBusy(null)
  }

  return (
    <>
      {signedIn && points && (
        <div className="points-banner">
          <span>Your balance</span>
          <b>{points.balance}</b>
        </div>
      )}
      {signedIn === false && (
        <p className="signin-note">
          <Link href="/login?redirectTo=/play">Sign in</Link> to see your balance and redeem offers.
        </p>
      )}

      {error && <p className="shop-error">{error}</p>}
      {offers === null && !error && <p className="muted">…</p>}
      {offers && offers.length === 0 && (
        <p className="muted" style={{ fontStyle: 'italic' }}>
          No offers available right now. Check back soon.
        </p>
      )}

      {offers && offers.length > 0 && (
        <ul className="shop-list">
          {offers.map((o) => {
            const result = results[o.id]
            const soldOut = o.stock !== null && o.stock <= 0
            const tooPoor = signedIn && points ? points.balance < o.cost : false
            const disabled = !signedIn || soldOut || tooPoor || busy === o.id
            return (
              <li key={o.id}>
                <div className="shop-info">
                  <strong>{o.title}</strong>
                  {o.partner && <span className="shop-partner">{o.partner}</span>}
                  <span className="shop-meta">
                    {o.cost} pts · {o.stock === null ? 'unlimited' : `${Math.max(o.stock, 0)} left`}
                  </span>
                  {result && 'code' in result && (
                    <span className="shop-code">Code: <span className="mono">{result.code}</span></span>
                  )}
                  {result && 'error' in result && (
                    <span className="shop-error">{result.error}</span>
                  )}
                </div>
                <button className="shop-redeem" disabled={disabled} onClick={() => onRedeem(o)}>
                  {busy === o.id ? 'Redeeming…' : soldOut ? 'Sold out' : 'Redeem'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
