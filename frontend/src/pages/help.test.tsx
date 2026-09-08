// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import HelpPage, { FAQS, helpScrollBehavior, matchesHelpItem, normalizeHelpText, toggleHelpItem } from "./help"

describe("página de Ajuda", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0)
      return 1
    })
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    })
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it("renderiza o cabeçalho, a busca e as respostas essenciais", () => {
    const markup = renderToStaticMarkup(<HelpPage />)
    expect(markup).toContain("Ajuda")
    expect(markup).toContain("Como podemos ajudar?")
    expect(markup).toContain("Respostas essenciais")
    expect(markup).toContain('aria-expanded="false"')
  })

  it("normaliza busca em português e encontra termos relacionados", () => {
    expect(normalizeHelpText("  Recorrência  ")).toBe("recorrencia")
    expect(FAQS.filter((item) => matchesHelpItem(item, "parcelado")).map((item) => item.id)).toContain("faq-recorrente-parcelado")
    expect(FAQS.filter((item) => matchesHelpItem(item, "saldo")).map((item) => item.id)).toEqual(expect.arrayContaining(["faq-receita-saldo", "faq-meta-saldo"]))
  })

  it("filtra por todas as palavras informadas", () => {
    const result = FAQS.filter((item) => matchesHelpItem(item, "meta saldo"))
    expect(result.map((item) => item.id)).toContain("faq-meta-saldo")
    expect(result.map((item) => item.id)).not.toContain("faq-compra-parcelada")
  })

  it("filtra os conteúdos ao digitar na busca e permite limpar o resultado", async () => {
    const user = userEvent.setup()
    render(<HelpPage />)

    const search = screen.getByRole("searchbox", { name: "Como podemos ajudar?" })
    await user.type(search, "parcelado")

    expect(screen.queryByRole("heading", { name: "Respostas essenciais" })).toBeNull()
    expect(screen.getByText(/resultados encontrados/i)).toBeTruthy()
    expect(screen.getAllByText("Recorrente x Parcelado").length).toBeGreaterThan(0)
    expect(screen.queryByText("Uma meta altera meu saldo?")).toBeNull()

    await user.click(screen.getByRole("button", { name: "Limpar busca" }))
    expect((search as HTMLInputElement).value).toBe("")
    expect(screen.getByRole("heading", { name: "Respostas essenciais" })).toBeTruthy()
  })

  it("abre e fecha um FAQ atualizando o estado acessível", async () => {
    const user = userEvent.setup()
    render(<HelpPage />)

    const question = screen.getByRole("button", { name: "O que é um lançamento?" })
    expect(question.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText(/É o registro de uma entrada ou saída específica/)).toBeNull()

    await user.click(question)
    expect(question.getAttribute("aria-expanded")).toBe("true")
    expect(screen.getByText(/É o registro de uma entrada ou saída específica/)).toBeTruthy()

    await user.click(question)
    expect(question.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText(/É o registro de uma entrada ou saída específica/)).toBeNull()
  })

  it("abre e focaliza a resposta escolhida nos atalhos essenciais", async () => {
    const user = userEvent.setup()
    render(<HelpPage />)

    await user.click(screen.getByRole("button", { name: /Meta x Saldo Metas acompanham objetivos/ }))

    const target = screen.getByRole("button", { name: "Meta x Saldo" })
    expect(target.getAttribute("aria-expanded")).toBe("true")
    expect(target).toBe(document.activeElement)
    expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled()
  })

  it("abre e fecha perguntas sem alterar o conjunto original", () => {
    const initial = new Set<string>()
    const opened = toggleHelpItem(initial, "faq-lancamento")
    const closed = toggleHelpItem(opened, "faq-lancamento")
    expect(initial.size).toBe(0)
    expect(opened.has("faq-lancamento")).toBe(true)
    expect(closed.has("faq-lancamento")).toBe(false)
  })

  it("remove a rolagem suave quando o usuário prefere menos movimento", () => {
    expect(helpScrollBehavior(true)).toBe("auto")
    expect(helpScrollBehavior(false)).toBe("smooth")
  })

  it("mantém o botão de limpar busca com alvo de toque de 44 pixels", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/help.tsx"), "utf8")
    expect(source).toMatch(/h-11 w-11[^>]+aria-label="Limpar busca"/)
    expect(source).toContain("[&::-webkit-search-cancel-button]:appearance-none")
  })

  it("possui aproximadamente 15 perguntas e cobre os textos críticos", () => {
    expect(FAQS).toHaveLength(16)
    const content = FAQS.map((item) => `${item.title} ${item.searchText}`).join(" ")
    expect(content).toMatch(/gasto fixo/i)
    expect(content).toMatch(/relatórios/i)
    expect(content).toMatch(/simulações/i)
  })

  it("registra a rota e a navegação para Ajuda", () => {
    const routes = readFileSync(resolve(process.cwd(), "src/main.tsx"), "utf8")
    const navigation = readFileSync(resolve(process.cwd(), "src/components/app-shell.tsx"), "utf8")
    expect(routes).toContain('path: "ajuda"')
    expect(routes).toContain('import("@/pages/help")')
    expect(navigation).toContain('{ to: "/ajuda", label: "Ajuda"')
  })

  it("não inclui termos técnicos nem promete simulações disponíveis", () => {
    const source = readFileSync(resolve(process.cwd(), "src/pages/help.tsx"), "utf8")
    for (const term of ["LangChain", "FastAPI", "PostgreSQL", "SQLAlchemy", "Neon", "repositories", "tool calling"]) {
      expect(source).not.toContain(term)
    }
    expect(source).toContain("ainda não estão disponíveis no Assistente Contaí")
    expect(source).not.toMatch(/Assistente (já )?(faz|oferece) simulaç/i)
  })
})
