import { SignIn } from '@clerk/nextjs'
import { AuthFrame } from '../../components/auth-frame'

export default function SignInPage() {
  return (
    <AuthFrame title="Volver a SIA" description="Si ya entraste antes, continúa con la misma cuenta de Google.">
      <SignIn signUpUrl="/sign-up" />
    </AuthFrame>
  )
}
