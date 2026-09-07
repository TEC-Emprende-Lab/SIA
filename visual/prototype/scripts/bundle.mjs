import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// The Vite build is a single entry; inline its local assets for a file:// preview.
const root = new URL('../', import.meta.url)
let html = await readFile(new URL('dist/index.html', root), 'utf8')
const scripts = [...html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)]
const styles = [...html.matchAll(/<link\b[^>]*href="([^"]+\.css)"[^>]*>/g)]
let inlineScripts = ''
for (const match of scripts) {
  const js = await readFile(new URL(`dist/${match[1].replace(/^\//, '')}`, root), 'utf8')
  inlineScripts += `<script>${js.replaceAll('</script', '<\\/script')}</script>`
  html = html.replace(match[0], '')
}
for (const match of styles) {
  const css = await readFile(new URL(`dist/${match[1].replace(/^\//, '')}`, root), 'utf8')
  html = html.replace(match[0], () => `<style>${css}</style>`)
}
html = html.replace('</body>', () => `${inlineScripts}</body>`)
html = html.replace(/[ \t]+(?=\r?\n)/g, '')
await writeFile(new URL('bundle.html', root), html)
console.log(`Standalone preview: ${resolve('bundle.html')} (${Math.round(Buffer.byteLength(html) / 1024)} KB)`)
