import { SignIn } from '@clerk/nextjs'
import { AuthFrame } from '../../components/auth-frame'

export default function SignInPage() {
  return <AuthFrame title="Iniciar sesión" description="Usa la cuenta de Google vinculada a tu invitación."><SignIn /></AuthFrame>
}
