import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

export function omitInputBearingSteps(result: { steps: unknown[] }) {
  // HTML serializes API step titles, including fill values, even with traces off.
  result.steps.length = 0;
}

export default class PrivateReporter implements Reporter {
  onTestEnd(_test: TestCase, result: TestResult) {
    omitInputBearingSteps(result);
  }
}
