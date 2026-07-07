import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin'
import { getAuth, signInWithCredential, GoogleAuthProvider, getIdToken } from '@react-native-firebase/auth'

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
})

// Returns a real Firebase ID token on a successful sign-in, or null if the
// user cancelled the native picker — that's not an error, just a no-op.
export async function signInWithGoogle(): Promise<string | null> {
  try {
    await GoogleSignin.hasPlayServices()
    const response = await GoogleSignin.signIn()
    if (isCancelledResponse(response)) return null
    const googleIdToken = response.data.idToken
    if (!googleIdToken) return null

    // GoogleSignin.signIn() only proves the user's Google identity — its ID
    // token has issuer accounts.google.com, not the Firebase ID token our
    // backend's Firebase Admin SDK verifies (issuer securetoken.google.com).
    // Exchange it through Firebase Auth to get a token the backend accepts.
    // Firebase's native Android SDK requires both idToken and accessToken —
    // the sign-in response above doesn't include the latter, so fetch it.
    const { accessToken } = await GoogleSignin.getTokens()
    const credential = GoogleAuthProvider.credential(googleIdToken, accessToken)
    const userCredential = await signInWithCredential(getAuth(), credential)
    return await getIdToken(userCredential.user)
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.SIGN_IN_CANCELLED) return null
      if (e.code === statusCodes.IN_PROGRESS) {
        throw new Error('A sign-in is already in progress.')
      }
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services is not available on this device.')
      }
      const message = 'message' in e && typeof e.message === 'string' ? e.message : ''
      throw new Error(`Google sign-in failed (${e.code}): ${message}`)
    }
    throw new Error(`Google sign-in failed: ${e instanceof Error ? e.message : String(e)}`)
  }
}
