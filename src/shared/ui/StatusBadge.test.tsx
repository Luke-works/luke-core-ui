import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatusBadge from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the human label for a running status", () => {
    render(<StatusBadge status="running" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("maps an incident status to its label", () => {
    render(<StatusBadge status="incident" />);
    expect(screen.getByText("Incident")).toBeInTheDocument();
  });
});
