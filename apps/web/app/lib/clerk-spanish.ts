import { esES } from '@clerk/localizations/es-ES'

// Complete the account and sign-in strings missing from Clerk's Spanish catalog.
const protectCheck = {
  loading: 'Cargando…',
  retryButton: 'Intentar de nuevo',
  subtitle: 'Espera mientras verificamos tu solicitud.',
  title: 'Verificando tu solicitud',
}

export const clerkSpanish = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      titleCombined: 'Continuar a {{applicationName}}',
      subtitleCombined: '',
    },
    protectCheck,
    passwordCompromised: { ...esES.signIn?.passwordCompromised, title: 'Contraseña comprometida' },
    passwordUntrusted: { ...esES.signIn?.passwordUntrusted, title: 'Contraseña no confiable' },
    passkeyMfa: {
      title: 'Usa tu clave de acceso',
      subtitle: 'Confirma tu identidad con tu clave de acceso. Tu dispositivo puede solicitar tu huella, tu rostro o el desbloqueo de pantalla.',
    },
    emailLink: {
      ...esES.signIn?.emailLink,
      verifiedTransferable: {
        ...esES.signIn?.emailLink?.verifiedTransferable,
        title: 'Correo verificado',
        subtitle: 'Vuelve a la pestaña original para continuar',
      },
    },
  },
  signUp: { ...esES.signUp, protectCheck },
  userProfile: {
    ...esES.userProfile,
    emailAddressPage: {
      ...esES.userProfile?.emailAddressPage,
      formHint: 'Debes verificar este correo antes de agregarlo a tu cuenta.',
    },
    start: {
      ...esES.userProfile?.start,
      connectedAccountsSection: {
        ...esES.userProfile?.start?.connectedAccountsSection,
        subtitle__disconnected: 'Esta cuenta se ha desconectado.',
      },
      passkeysSection: {
        ...esES.userProfile?.start?.passkeysSection,
        primaryButton: 'Agregar una clave de acceso',
      },
    },
  },
}
