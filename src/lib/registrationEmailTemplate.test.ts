import { describe, expect, it } from "vitest";
import { buildRegistrationEmailTemplate } from "./registrationEmailTemplate";

describe("buildRegistrationEmailTemplate", () => {
  it("builds coach variant with required instructions", () => {
    const template = buildRegistrationEmailTemplate({
      naam: "Jan Jansen",
      rol: "coach",
      appUrl: "https://dia-live.nl/",
      email: "jan@example.com",
    });

    expect(template.subject).toContain("coach");
    expect(template.body).toContain("jan@example.com");
    expect(template.body).toContain("Verifieer je e-mailadres");
    expect(template.body).toContain("https://dia-live.nl");
  });

  it("builds scheidsrechter variant", () => {
    const template = buildRegistrationEmailTemplate({
      naam: "Piet Pieters",
      rol: "scheidsrechter",
      appUrl: "https://dia-live.nl",
      email: "ref@example.com",
    });

    expect(template.subject).toContain("scheidsrechter");
    expect(template.body).toContain("scheidsrechter");
  });

  it("never references pin-based access wording", () => {
    const template = buildRegistrationEmailTemplate({
      naam: "Test",
      rol: "coach",
      appUrl: "https://dia-live.nl",
      email: "test@example.com",
    });

    expect(template.subject.toLowerCase()).not.toContain("pin");
    expect(template.body.toLowerCase()).not.toContain("pin");
  });
});
