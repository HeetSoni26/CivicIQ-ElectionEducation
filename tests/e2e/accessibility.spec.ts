import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * @file accessibility.spec.ts
 * @description Automated accessibility auditing for the CivicIQ platform.
 * Ensures WCAG 2.2 Level AA compliance across all critical screens.
 * 
 * @category Testing/Accessibility
 */

test.describe("CivicIQ Accessibility Audit", () => {
  const routes = ["/", "/guide", "/chat", "/educators"];

  for (const route of routes) {
    test(`page ${route} should have no detectable a11y violations`, async ({ page }) => {
      await page.goto(route);
      
      // Wait for any animations/loading to settle
      await page.waitForTimeout(500);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
