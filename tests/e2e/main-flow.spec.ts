import { test, expect } from "@playwright/test";

/**
 * @file main-flow.spec.ts
 * @description End-to-End test suite for the primary user journey in CivicIQ.
 * Covers the Election Guide Wizard and AI Chat (CivicBot).
 * 
 * @category Testing/E2E
 */

test.describe("CivicIQ Core Flow", () => {
  test("should complete the primary election guide wizard journey", async ({ page }) => {
    // 1. Visit Home Page
    await page.goto("/");
    await expect(page.locator("h1")).toContainText(/CivicIQ/i);

    // 2. Navigate to Election Guide
    const startGuideButton = page.getByRole("link", { name: /Election Guide/i });
    await startGuideButton.click();
    await expect(page).toHaveURL(/\/guide/);

    // 3. Step 1: Select Country
    await expect(page.getByText(/Where do you live\?/i)).toBeVisible();
    await page.getByRole("button", { name: /United States/i }).click();

    // 4. Step 2: Eligibility Check
    await expect(page.getByText(/Check Your Eligibility/i)).toBeVisible();
    await page.locator('input[type="date"]').fill("2000-01-01");
    await page.getByText(/Yes, I am a citizen/i).click();
    await page.getByRole("button", { name: /Check Eligibility/i }).click();

    // 5. Verify Results
    await expect(page.getByText(/You appear to be eligible to vote/i)).toBeVisible();
    await page.getByRole("button", { name: /Continue/i }).click();
    
    // 6. Registration Step
    await expect(page.getByText(/How to Register/i)).toBeVisible();
  });

  test("should interact with CivicBot AI Chat", async ({ page }) => {
    await page.goto("/chat");
    
    // Check initial state
    await expect(page.getByText(/Hello! I'm CivicBot/i)).toBeVisible();

    // Ask a common question
    await page.getByRole("button", { name: /How do I register to vote\?/i }).click();

    // Wait for response and check safety compliance
    const response = page.locator(".chat-message-assistant");
    await expect(response).toBeVisible({ timeout: 5000 });
    
    // Verify factual citation
    await expect(page.getByText(/Official Sources/i)).toBeVisible();
  });
});
