import { SignIn } from '@clerk/nextjs'
import styles from '../../auth.module.css'

export default function SignInPage() {
  return <main className={styles.page}>
    <section className={styles.intro} aria-label="Sistema de Incubación y Acompañamiento">
      <div className={styles.brand}><span className={styles.brandMark}>S</span><span>SIA<small>TEC EMPRENDE LAB</small></span></div>
      <div className={styles.introContent}><p className={styles.eyebrow}>CataliTech · TEC Emprende Lab</p><h1>El siguiente paso empieza con claridad.</h1><p>Da seguimiento a los acuerdos, evidencia y aprendizajes que hacen avanzar tu emprendimiento.</p></div>
      <span className={styles.footnote}>Acceso seguro para personas invitadas al programa.</span>
    </section>
    <section className={styles.formSide}>
      <div className={styles.formWrap}><h2>Bienvenido de vuelta</h2><p>Ingresa con la cuenta de Google vinculada a tu invitación.</p><SignIn /></div>
    </section>
  </main>
}
