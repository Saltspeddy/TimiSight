'use client'
import { useEffect, useState, useSyncExternalStore, type ReactNode, type SyntheticEvent } from 'react'
import { T, PLACES, TEAM, type Lang, type Place, type Tr } from '../lib/site-data'
import './site.css'

// Hash + language live in external stores so server and browser render the same first frame
const hashSub = (cb: () => void) => { addEventListener('hashchange', cb); return () => removeEventListener('hashchange', cb) }
const useHash = () => useSyncExternalStore(hashSub, () => location.hash, () => '')

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

const go = (id: string) => {
  const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  if (location.hash.startsWith('#/place')) { location.hash = '#/'; setTimeout(scroll, 60) } else scroll()
}

function Header({ lang, setLang, t }: { lang: Lang; setLang: (l: Lang) => void; t: Tr }) {
  const ids = ['how', 'preview', 'places', 'team']
  return (
    <header className="hdr">
      <a className="logo" href="#/">{t.appName}</a>
      <nav aria-label="Main">
        {t.nav.map((n, i) => <button key={n} onClick={() => go(ids[i])}>{n}</button>)}
      </nav>
      <div className="lang" role="group" aria-label="Language">
        {(['en', 'ro'] as Lang[]).map((l) => (
          <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
        ))}
      </div>
    </header>
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
  return (
    <main>
      <section className="hero">
        <div>
          <h1>{t.heroTitle}</h1>
          <p className="lead">{t.heroText}</p>
          <div className="row">
            <button className="btn" onClick={() => go('places')}>{t.cta}</button>
            <button className="btn ghost" onClick={() => go('team')}>{t.cta2}</button>
          </div>
        </div>
        <div className="stamp" aria-hidden="true"><span>Timișoara</span><b>1989</b><span>2026</span></div>
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
            <div className="map">
              {[[22, 30], [60, 22], [45, 58], [72, 70]].map(([x, y], i) => <i key={i} style={{ left: x + '%', top: y + '%' }} />)}
              <div className="card"><b>{t.events}</b>{t.evs.slice(0, 2).map((e) => <span key={e}>{e}</span>)}</div>
            </div>
          </Phone>
          <Phone title={t.s2}>
            <ul className="board">
              {board.map(([n, p], i) => <li key={n} className={n === 'You' ? 'me' : ''}><span>{i + 1}</span>{n}<b>{p}</b></li>)}
            </ul>
          </Phone>
          <Phone title={t.s3}>
            <div className="ar"><em>{t.arLabel}</em><strong>1989</strong></div>
          </Phone>
        </div>
      </section>

      <section id="places" className="sec">
        <h2>{t.placesTitle}</h2>
        <p className="sub">{t.placesText}</p>
        <ul className="tickets">
          {PLACES.map((p) => (
            <li key={p.id} className={p.live ? 'live' : ''}>
              <h3>{p[lang].name}</h3>
              {p.live ? <a className="btn sm" href={`#/place/${p.id}`}>{t.open}</a> : <span className="soon">{t.soon}</span>}
            </li>
          ))}
        </ul>
      </section>

      <section id="team" className="sec">
        <h2>{t.teamTitle}</h2>
        <p className="sub">{t.teamText}</p>
        <ul className="team">
          {TEAM.map((m, i) => <li key={i}><div className="avatar" aria-hidden="true">{m.name[0]}</div><b>{m.name}</b><span>{t.roles[i]}</span></li>)}
        </ul>
      </section>
      <footer>{t.footer}</footer>
    </main>
  )
}

function Compare({ place, t }: { place: Place; t: Tr }) {
  const [pos, setPos] = useState(50)
  const hide = (e: SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = 'none' }
  return (
    <div className="cmp">
      <div className="frame">
        <img src={place.nowImg} alt={t.now} onError={hide} />
        <div className="top" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          <img src={place.thenImg} alt={t.then} onError={hide} />
        </div>
        <span className="tag l">{t.then}</span><span className="tag r">{t.now}</span>
        <i className="bar" style={{ left: pos + '%' }} />
      </div>
      <label>{t.drag}
        <input type="range" min="0" max="100" value={pos} onChange={(e) => setPos(+e.target.value)} />
      </label>
    </div>
  )
}

function PlacePage({ id, t, lang }: { id: string; t: Tr; lang: Lang }) {
  const place = PLACES.find((p) => p.id === id && p.live)
  const [done, setDone] = useState(false)
  if (!place) return <main className="sec"><a href="#/">{t.back}</a></main>
  const c = place[lang]
  return (
    <main className="place">
      <a className="back" href="#/">{t.back}</a>
      <p className="era">{c.era}</p>
      <h1>{c.name}</h1>
      <p className="lead serif">{c.text}</p>
      <h2>{t.video}</h2>
      <video controls playsInline preload="metadata" src={place.video} />
      <p className="note">{t.videoNote}</p>
      <h2>{t.history}</h2>
      <Compare place={place} t={t} />
      <button className="btn" onClick={() => setDone(true)}>{t.checkin}</button>
      {done && <p className="ok" role="status">{t.checked}</p>}
    </main>
  )
}

export default function App() {
  const [lang, setLang] = useLang()
  const hash = useHash()
  const t = T[lang]
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  useEffect(() => { if (hash.startsWith('#/place')) scrollTo(0, 0) }, [hash])
  const m = hash.match(/^#\/place\/(\w+)/)
  return (
    <div className="site">
      <Header lang={lang} setLang={setLang} t={t} />
      {m ? <PlacePage id={m[1]} t={t} lang={lang} /> : <Home t={t} lang={lang} />}
    </div>
  )
}
