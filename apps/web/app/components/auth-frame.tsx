import type { ReactNode } from 'react'
import { SiaBrand } from './sia-brand'
import styles from '../auth.module.css'

export function AuthFrame({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className={styles.page}>
    <header className={`${styles.header} auth-header`}><SiaBrand /></header>
    <section className={styles.formSide}>
      <div className={styles.formWrap}>
        <p className={styles.eyebrow}>Acceso a SIA</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
        {children}
      </div>
    </section>
    <footer className={styles.footer}><span>Tu acceso a proyectos depende de una invitación vigente con este mismo correo.</span><span>Catalitec de TEC Emprende Lab</span></footer>
  </main>
}
