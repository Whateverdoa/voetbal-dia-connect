import { describe, expect, it } from "vitest";
import {
  inspectTemplate,
  parseEnvFile,
  TEMPLATE_CLAIMS,
} from "./clerkJwt.mjs";

const validTemplate = {
  id: "jtmp_1",
  name: "convex",
  lifetime: 3600,
  claims: TEMPLATE_CLAIMS,
};

describe("inspectTemplate", () => {
  it("accepts a template with aud convex and the email shortcode", () => {
    expect(inspectTemplate(validTemplate)).toEqual({ ok: true, problems: [] });
  });

  it("rejects a missing template", () => {
    const result = inspectTemplate(null);
    expect(result.ok).toBe(false);
    expect(result.problems[0]).toContain("does not exist");
  });

  it("rejects a wrong audience", () => {
    const result = inspectTemplate({
      ...validTemplate,
      claims: { ...TEMPLATE_CLAIMS, aud: "https://clerk.example.com" },
    });
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toContain('claim "aud"');
  });

  it("rejects a dropped email claim, the cause of the empty nav bar", () => {
    const result = inspectTemplate({
      ...validTemplate,
      claims: { aud: "convex", name: "{{user.full_name}}" },
    });
    expect(result.ok).toBe(false);
    expect(result.problems.join(" ")).toContain('claim "email"');
  });

  it("rejects a hardcoded email instead of the shortcode", () => {
    const result = inspectTemplate({
      ...validTemplate,
      claims: { ...TEMPLATE_CLAIMS, email: "someone@example.com" },
    });
    expect(result.ok).toBe(false);
  });
});

describe("parseEnvFile", () => {
  it("reads keys, ignores comments and strips quotes", () => {
    const env = parseEnvFile(
      ['# comment', 'CLERK_SECRET_KEY="sk_test_abc"', "", "OTHER=plain"].join(
        "\n",
      ),
    );
    expect(env.CLERK_SECRET_KEY).toBe("sk_test_abc");
    expect(env.OTHER).toBe("plain");
  });

  it("keeps values that contain an equals sign", () => {
    const env = parseEnvFile("TOKEN=abc=def==");
    expect(env.TOKEN).toBe("abc=def==");
  });
});
