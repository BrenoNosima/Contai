// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import { Dialog } from "./dialog"

afterEach(cleanup)
it("keeps focus when a parent supplies a new close callback", async () => {
  const children = <><input aria-label="First" /><input aria-label="Second" /></>
  const view = render(<Dialog open title="Synthetic" onClose={() => {}}>{children}</Dialog>)
  await waitFor(() => expect(document.activeElement).toBe(view.getByLabelText("Fechar")))
  view.getByLabelText("Second").focus()
  view.rerender(<Dialog open title="Synthetic" onClose={() => {}}>{children}</Dialog>)
  await new Promise((resolve) => setTimeout(resolve, 30))
  expect(document.activeElement).toBe(view.getByLabelText("Second"))
})
