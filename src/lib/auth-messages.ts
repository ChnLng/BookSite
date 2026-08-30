export function authErrorMessage(error: { message?: string; code?: string } | null | undefined) {
  const value = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  if (/invalid_credentials|invalid login credentials/.test(value)) return "L’e-mail ou le mot de passe est incorrect. Vérifiez votre saisie ou réinitialisez votre mot de passe.";
  if (/email_not_confirmed|email not confirmed/.test(value)) return "Confirmez d’abord votre adresse avec le dernier e-mail Visd AR reçu. Vérifiez aussi les courriers indésirables.";
  if (/over_email_send_rate_limit|over_request_rate_limit|rate limit|too many/.test(value)) return "Trop de tentatives rapprochées. Patientez quelques instants avant de réessayer.";
  if (/weak_password|password.*(least|short)/.test(value)) return "Choisissez un mot de passe plus long et difficile à deviner.";
  if (/user_already_exists|already registered/.test(value)) return "Cette adresse possède déjà un compte. Connectez-vous ou utilisez « Mot de passe oublié » pour récupérer l’accès.";
  if (/fetch|network|timeout|load failed/.test(value)) return "La connexion a été interrompue. Vérifiez votre réseau puis réessayez.";
  if (/email.*(authorized|sending)|smtp/.test(value)) return "L’envoi des e-mails est momentanément indisponible. Réessayez plus tard ou utilisez votre méthode de connexion habituelle.";
  return "La connexion n’a pas abouti. Réessayez dans un instant ou contactez Visd AR si le problème persiste.";
}
