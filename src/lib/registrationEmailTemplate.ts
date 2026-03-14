export type RegistrationRole = "coach" | "scheidsrechter";

export interface RegistrationEmailInput {
  naam: string;
  rol: RegistrationRole;
  appUrl: string;
  email: string;
}

export interface RegistrationEmailTemplate {
  subject: string;
  body: string;
}

function roleLabel(rol: RegistrationRole): string {
  return rol === "coach" ? "coach" : "scheidsrechter";
}

export function buildRegistrationEmailTemplate(
  input: RegistrationEmailInput
): RegistrationEmailTemplate {
  const appUrl = input.appUrl.replace(/\/+$/, "");
  const role = roleLabel(input.rol);

  const subject = `DIA Live toegang activeren als ${role}`;
  const body = [
    `Beste ${input.naam},`,
    "",
    `Je bent door DIA toegevoegd als ${role} in DIA Live.`,
    "",
    "Volg deze stappen:",
    `1. Maak een account aan met dit e-mailadres: ${input.email}`,
    "2. Verifieer je e-mailadres via de bevestigingsmail",
    `3. Ga naar ${appUrl} en log in`,
    "4. Kies je rol tijdens onboarding als die nog niet automatisch is gezet",
    "",
    "Lukt dit niet? Reageer op deze e-mail of neem contact op met het team.",
    "",
    "Groet,",
    "DIA Live",
  ].join("\n");

  return { subject, body };
}
