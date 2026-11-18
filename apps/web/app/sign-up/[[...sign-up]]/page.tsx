import { SignUp } from '@clerk/nextjs'
import { AuthFrame } from '../../components/auth-frame'

export default function SignUpPage() {
  return (
    <AuthFrame title="Crear tu acceso a SIA" description="Si es tu primera vez, continúa con la cuenta de Google que recibió la invitación vigente.">
      <SignUp signInUrl="/sign-in" />
    </AuthFrame>
  )
}
