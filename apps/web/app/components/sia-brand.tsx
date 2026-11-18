import Link from 'next/link'

export function SiaBrand() {
  return <Link className="brand sia-brand" href="/" aria-label="SIA, inicio">
    <span className="brand-mark"><img src="/brand/logo.svg" alt="" /></span>
    <span><strong>SIA</strong><small>TEC Emprende Lab</small></span>
  </Link>
}
