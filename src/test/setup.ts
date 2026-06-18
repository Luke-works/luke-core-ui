// Vitest global setup: jest-dom matchers (toBeInTheDocument, …) and unmount
// between tests so the DOM stays isolated.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => cleanup());
