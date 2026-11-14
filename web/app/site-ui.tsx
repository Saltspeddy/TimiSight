'use client'
import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { T, FLOWERS, TEAM, APP_URL, type Lang, type Flower, type Tr } from '../lib/site-data'
import './site.css'

// Language lives in an external store so server and browser render the same first frame
const langSub = (cb: () => void) => { addEventListener('langchange', cb); return () => removeEventListener('langchange', cb) }
const getLang = (): Lang => {
  try { const s = localStorage.getItem('lang'); if (s === 'en' || s === 'ro') return s } catch {}
  return navigator.language?.startsWith('ro') ? 'ro' : 'en'
}
const useLang = () => {
  const lang = useSyncExternalStore(langSub, getLang, (): Lang => 'en')
  const setLang = (l: Lang) => { try { localStorage.setItem('lang', l) } catch {} ; dispatchEvent(new Event('langchange')) }
  return [lang, setLang] as const
}

const go = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

function Header({ lang, setLang, t, compact }: { lang: Lang; setLang: (l: Lang) => void; t: Tr; compact?: boolean }) {
  const ids = ['how', 'preview', 'flowers', 'team']
  return (
    <header className="hdr">
      <Link className="logo" href="/">
        <Image src="/logo.png" alt="" width={40} height={40} priority />
        {t.appName}
      </Link>
      {!compact && (
        <nav aria-label="Main">
          {t.nav.map((n, i) => <button key={n} onClick={() => go(ids[i])}>{n}</button>)}
        </nav>
      )}
      <a className="btn sm store" href={APP_URL} target="_blank" rel="noopener noreferrer">{t.getApp}</a>
      <div className="lang" role="group" aria-label="Language">
        {(['en', 'ro'] as Lang[]).map((l) => (
          <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
        ))}
      </div>
      {!compact && <Link className="btn sm" href="/login">{t.signIn}</Link>}
    </header>
  )
}

// Simple flower drawn in the flower's own color. Stands in until the real PNG is added.
function FlowerGlyph({ color }: { color: string }) {
  return (
    <svg className="glyph" viewBox="0 0 100 100" aria-hidden="true">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse key={deg} cx="50" cy="27" rx="12" ry="20" fill={color} stroke="#12142b" strokeWidth="3" transform={`rotate(${deg} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="11" fill="#ffd23f" stroke="#12142b" strokeWidth="3" />
    </svg>
  )
}

// The colored mat behind a flower, same idea as the app's flower page and garden cards.
function Mat({ flower, lang, className = '', priority = false }: { flower: Flower; lang: Lang; className?: string; priority?: boolean }) {
  return (
    <div className={`mat ${className}`} style={{ background: flower.color }}>
      <div className="photo">
        {flower.image
          ? <Image src={flower.image} alt={flower.name[lang]} fill priority={priority} sizes="(max-width: 600px) 90vw, 420px" style={{ objectFit: 'contain' }} />
          : <FlowerGlyph color={flower.color} />}
      </div>
    </div>
  )
}

function Phone({ title, children }: { title: string; children: ReactNode }) {
  return (
    <figure className="phone">
      <div className="screen">{children}</div>
      <figcaption>{title}</figcaption>
    </figure>
  )
}

function Home({ t, lang }: { t: Tr; lang: Lang }) {
  const board = [['Ana M.', 1240], ['Radu P.', 1180], ['You', 1020], ['Ioana T.', 940]]
  const featured = FLOWERS.find((f) => f.image) ?? FLOWERS[0]
  const owned = FLOWERS.slice(0, 2)
  const locked = FLOWERS.slice(2)
  return (
    <main>
      <section className="hero">
        <div>
          <h1>{t.heroTitle}</h1>
          <p className="lead">{t.heroText}</p>
          <div className="row">
            <a className="btn store" href={APP_URL} target="_blank" rel="noopener noreferrer">{t.store}</a>
            <button className="btn" onClick={() => go('flowers')}>{t.cta}</button>
            <button className="btn ghost" onClick={() => go('team')}>{t.cta2}</button>
          </div>
        </div>
        <div className="hero-art">
          <Mat flower={featured} lang={lang} className="tilt" priority />
          <div className="stamp" aria-hidden="true"><span>{t.stampTop}</span><b>{FLOWERS.length}</b><span>{t.stampBottom}</span></div>
        </div>
      </section>

      <section id="how" className="sec">
        <h2>{t.howTitle}</h2>
        <ol className="steps">
          {t.how.map(([h, p]) => <li key={h}><h3>{h}</h3><p>{p}</p></li>)}
        </ol>
      </section>

      <section id="preview" className="sec dark">
        <h2>{t.prevTitle}</h2>
        <p className="sub">{t.prevText}</p>
        <div className="phones">
          <Phone title={t.s1}>
            <div className="app-flower">
              <Mat flower={featured} lang={lang} />
              <h4>{featured.name[lang]}</h4>
              <div className="got">
                <div><b>✓ {t.checked}</b><span>{t.total}: {featured.points} {t.pts}</span></div>
                <i>+{featured.points}</i>
              </div>
            </div>
          </Phone>
          <Phone title={t.s2}>
            <div className="app-garden">
              <h4>{lang === 'ro' ? 'Grădina' : 'Garden'}</h4>
              <p>{owned.length} / {FLOWERS.length}</p>
              <div className="gcards">
                {owned.map((f) => (
                  <div key={f.id} className="gcard">
                    <div className="gthumb" style={{ background: f.color }}>
                      {f.image ? <Image src={f.image} alt="" fill sizes="90px" style={{ objectFit: 'contain' }} /> : <FlowerGlyph color="#fff" />}
                    </div>
                    <span>{f.name[lang]}</span>
                  </div>
                ))}
                {locked.map((f) => (
                  <div key={f.id} className="gcard lock"><b>?</b><span>{t.findIt}</span></div>
                ))}
              </div>
            </div>
          </Phone>
          <Phone title={t.s3}>
            <ul className="board">
              {board.map(([n, p], i) => <li key={n} className={n === 'You' ? 'me' : ''}><span>{i + 1}</span>{n}<b>{p}</b></li>)}
            </ul>
          </Phone>
        </div>
      </section>

      <section id="flowers" className="sec">
        <h2>{t.flowersTitle}</h2>
        <p className="sub">{t.flowersText}</p>
        <ul className="flowers">
          {FLOWERS.map((f) => (
            <li key={f.id}>
              <Mat flower={f} lang={lang} />
              <h3>{f.name[lang]}</h3>
              <p className="spot">{f.spot[lang]}</p>
              <Link className="btn sm" href={`/f/${f.id}`}>{t.open}</Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="download" className="dl">
        <h2>{t.dlTitle}</h2>
        <p>{t.dlText}</p>
        <a className="btn store big" href={APP_URL} target="_blank" rel="noopener noreferrer">{t.store}</a>
      </section>

      <section id="team" className="sec">
        <h2>{t.teamTitle}</h2>
        <p className="sub">{t.teamText}</p>
        <ul className="team">
          {TEAM.map((m, i) => <li key={i}><div className="avatar" aria-hidden="true">{m.name[0]}</div><b>{m.name}</b></li>)}
        </ul>
      </section>
      <footer>{t.footer}</footer>
    </main>
  )
}

function FlowerPage({ id, t, lang }: { id: string; t: Tr; lang: Lang }) {
  const flower = FLOWERS.find((f) => f.id === id)
  if (!flower) return <main className="sec"><Link className="back" href="/">{t.back}</Link></main>
  const other: Lang = lang === 'en' ? 'ro' : 'en'
  return (
    <main className="place">
      <Link className="back" href="/">{t.back}</Link>
      <Mat flower={flower} lang={lang} className="big" priority />
      <h1>{flower.name[lang]}</h1>
      <p className="alt">{flower.name[other]}</p>
      {flower.latinName && <p className="latin">{flower.latinName}</p>}
      <p className="hint">{t.scanHint}</p>

      <h2>{t.theFlower}</h2>
      <p className="lead serif">{flower.about[lang]}</p>

      <h2>{t.thePlace}</h2>
      <p className="spot-name">{flower.spot[lang]}</p>
      <p className="body">{flower.place[lang]}</p>


      <h2>{t.moreFlowers}</h2>
      <div className="dots">
        {FLOWERS.map((f) => (
          <Link key={f.id} href={`/f/${f.id}`} className={f.id === flower.id ? 'dot current' : 'dot'} style={{ background: f.color }} aria-label={f.name[lang]} title={f.name[lang]}>
            {f.name[lang][0]}
          </Link>
        ))}
      </div>

      <aside className="more">
        <h2>{t.moreTitle}</h2>
        <p>{t.moreText}</p>
        <div className="row">
          <a className="btn store big" href={APP_URL} target="_blank" rel="noopener noreferrer">{t.store}</a>
          <Link className="btn ghost big" href="/play">{t.ranking}</Link>
        </div>
      </aside>
    </main>
  )
}

export default function Site({ flowerId }: { flowerId?: string }) {
  const [lang, setLang] = useLang()
  const t = T[lang]
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  return (
    <div className="site">
      <Header lang={lang} setLang={setLang} t={t} compact={!!flowerId} />
      {flowerId ? <FlowerPage id={flowerId} t={t} lang={lang} /> : <Home t={t} lang={lang} />}
    </div>
  )
}
