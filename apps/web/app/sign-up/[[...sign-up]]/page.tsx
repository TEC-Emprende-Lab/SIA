import { SignUp } from '@clerk/nextjs'
import styles from '../../auth.module.css'

export default function SignUpPage() {
  return <main className={styles.page}>
    <section className={styles.intro} aria-label="Sistema de Incubación y Acompañamiento">
      <div className={styles.brand}><span className={styles.brandMark}>S</span><span>SIA<small>TEC EMPRENDE LAB</small></span></div>
      <div className={styles.introContent}><p className={styles.eyebrow}>CataliTech · TEC Emprende Lab</p><h1>Una red para convertir intención en avance.</h1><p>Regístrate con el correo que recibió la invitación al espacio de incubación.</p></div>
      <span className={styles.footnote}>El acceso se activa únicamente con una invitación vigente.</span>
    </section>
    <section className={styles.formSide}>
      <div className={styles.formWrap}><h2>Crear acceso</h2><p>Usa el mismo correo verificado de tu invitación.</p><SignUp /></div>
    </section>
  </main>
}
