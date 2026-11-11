import { SignUp } from '@clerk/nextjs'
import { AuthFrame } from '../../components/auth-frame'

export default function SignUpPage() {
  return <AuthFrame title="Crear tu acceso" description="Regístrate con el correo que recibió la invitación a SIA."><SignUp /></AuthFrame>
}
