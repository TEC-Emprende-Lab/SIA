import Link from 'next/link'
import { ArrowRight, FileText, FolderOpen, Target } from 'lucide-react'
import styles from './shell.module.css'

export function PublicHome() {
  return <main className={styles.guest}>
    <section className={styles.guestHero}>
      <p className={styles.guestEyebrow}>Sistema de Incubación y Acompañamiento</p>
      <h1>El espacio de trabajo<br />{' '}<span>de tu emprendimiento.</span></h1>
      <p className={styles.guestLead}>Objetivos, avances y acuerdos de cada ciclo.<span>Toda la información de tu proyecto, con el equipo que te acompaña.</span></p>
      <div className={styles.guestSteps}>
        <Link className={styles.guestAction} href="/sign-in">Iniciar sesión <ArrowRight size={17} /></Link>
        <Link className={styles.guestActionSecondary} href="/sign-up">Tengo una invitación</Link>
      </div>
      <p className={styles.guestNote}>Ingresa con el correo al que recibiste tu invitación.</p>
    </section>
    <section className={styles.guestOverview} aria-label="Tu trabajo en SIA">
      <p>Un registro continuo de cada proyecto</p>
      <div><Target size={21} strokeWidth={1.4} /><span><strong>Objetivos y actividades</strong><small>Organiza el trabajo de tu ciclo y registra sus avances.</small></span><span className={styles.overviewNumber}>01</span></div>
      <div><FolderOpen size={21} strokeWidth={1.4} /><span><strong>Evidencias y documentos</strong><small>Conserva los resultados que respaldan cada avance.</small></span><span className={styles.overviewNumber}>02</span></div>
      <div><FileText size={21} strokeWidth={1.4} /><span><strong>Acuerdos y seguimiento</strong><small>Consulta reuniones, decisiones e informes del proyecto.</small></span><span className={styles.overviewNumber}>03</span></div>
    </section>
    <footer className={styles.guestFooter}><span>Catalitec de TEC Emprende Lab</span><span>Sistema de Incubación y Acompañamiento</span></footer>
  </main>
}
