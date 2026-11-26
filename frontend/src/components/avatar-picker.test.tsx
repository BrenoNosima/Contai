// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AvatarPicker } from "./avatar-picker"

afterEach(cleanup)
it("previews a selection and saves only when requested", async () => {
  const save = vi.fn().mockResolvedValue(undefined)
  render(<AvatarPicker value="person" onSave={save} />)
  expect(screen.getAllByRole("radio")).toHaveLength(16)
  await userEvent.click(screen.getByRole("radio", { name: "Gato" }))
  expect(screen.getByRole("radio", { name: "Gato" }).getAttribute("aria-checked")).toBe("true")
  expect(save).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole("button", { name: "Salvar avatar" }))
  expect(save).toHaveBeenCalledWith("cat")
  expect((await screen.findByRole("status")).textContent).toBe("Avatar atualizado.")
})

it("supports keyboard selection and leaves failed saves recoverable", async () => {
  const save = vi.fn().mockRejectedValue(new Error("unavailable"))
  render(<AvatarPicker value="person" onSave={save} />)
  screen.getByRole("radio", { name: "Pessoa" }).focus()
  await userEvent.keyboard("{ArrowRight}")
  expect(document.activeElement).toBe(screen.getByRole("radio", { name: "Gato" }))
  await userEvent.click(screen.getByRole("button", { name: "Salvar avatar" }))
  expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível salvar")
  expect((screen.getByRole("button", { name: "Salvar avatar" }) as HTMLButtonElement).disabled).toBe(false)
})
