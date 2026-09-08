import { useMemo, useState, type ReactNode } from "react"
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  FileText,
  ListFilter,
  MessageCircle,
  ReceiptText,
  Repeat2,
  Search,
  Target,
  WalletCards,
  X,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, Input } from "@/components/ui/primitives"
import { cn } from "@/lib/utils"

type HelpItem = {
  id: string
  title: string
  content: ReactNode
  searchText: string
}

const ESSENTIALS = [
  { title: "O que entra no meu saldo?", target: "concluido-pendente", description: "Somente receitas recebidas e despesas pagas.", icon: WalletCards },
  { title: "Pago x Pendente", target: "concluido-pendente", description: "Entenda quando uma movimentação afeta seus números.", icon: CheckCircle2 },
  { title: "Gasto fixo x Recorrência", target: "fixo-recorrencia", description: "Escolha o cadastro certo e evite duplicidades.", icon: Repeat2 },
  { title: "Recorrente x Parcelado", target: "recorrente-parcelado", description: "Separe cobranças contínuas de compras com fim.", icon: ReceiptText },
  { title: "Meta x Saldo", target: "meta-saldo", description: "Metas acompanham objetivos, mas não movimentam dinheiro.", icon: Target },
  { title: "Confirmação do Assistente", target: "confirmacao-assistente", description: "Você revisa antes de qualquer alteração.", icon: MessageCircle },
]

const DIFFERENCES: HelpItem[] = [
  {
    id: "lancamento-gasto-fixo",
    title: "Lançamento x Gasto fixo",
    searchText: "lançamento gasto fixo mercado academia mensal cobrança duplicada saldo",
    content: <><Comparison leftTitle="Lançamento" left="Uma entrada ou saída específica." rightTitle="Gasto fixo" right="Uma despesa mensal habitual com dia de cobrança." /><Example>Mercado de R$ 100 → lançamento. Academia de R$ 120 todo dia 10 → gasto fixo.</Example><Warning>Evite cadastrar a mesma conta como gasto fixo e recorrência, pois isso pode gerar cobranças duplicadas.</Warning></>,
  },
  {
    id: "fixo-recorrencia",
    title: "Gasto fixo x Recorrência",
    searchText: "gasto fixo recorrência aluguel salário receita despesa semanal mensal dia cobrança",
    content: <><Comparison leftTitle="Gasto fixo" left="É somente despesa, sempre mensal e possui um dia de cobrança. Fica na área Gastos fixos." rightTitle="Recorrência" right="Pode ser receita ou despesa, semanal ou mensal, e usa um lançamento como referência." /><Example>Aluguel → gasto fixo. Salário mensal → receita recorrente.</Example></>,
  },
  {
    id: "recorrente-parcelado",
    title: "Recorrente x Parcelado",
    searchText: "recorrente parcelado parcela assinatura netflix celular compra quantidade fim mensal",
    content: <><Comparison leftTitle="Recorrente" left="Continua sem uma quantidade final definida." rightTitle="Parcelado" right="Termina depois de um número conhecido de parcelas." /><Example>Netflix de R$ 39,90/mês → recorrente. Celular de R$ 3.000 em 10x → parcelado.</Example></>,
  },
  {
    id: "concluido-pendente",
    title: "Concluído x Pendente",
    searchText: "concluído pendente pago paga recebida receber saldo disponível receita despesa realizado previsto",
    content: <><Comparison leftTitle="Paga ou recebida" left="O dinheiro já saiu ou entrou. O lançamento afeta o saldo e aparece nos relatórios." rightTitle="Pendente ou a receber" right="A movimentação está prevista e ainda não altera o saldo disponível." /><p>“Concluído” é apenas o nome usado nas listas para uma despesa paga ou receita recebida — não é uma situação diferente.</p></>,
  },
  {
    id: "saldo-disponivel-projetado",
    title: "Saldo disponível x Saldo projetado",
    searchText: "saldo disponível saldo projetado futuro planejamento simulação recebida paga pendente dinheiro",
    content: <><Comparison leftTitle="Saldo disponível" left="Considera apenas receitas recebidas e despesas pagas." rightTitle="Saldo projetado" right="Também consideraria valores futuros e seria apenas uma estimativa." /><p className="text-subtle">O saldo projetado ainda não está disponível visualmente nem no Assistente Contaí. Esse recurso poderá aparecer futuramente.</p></>,
  },
  {
    id: "meta-saldo",
    title: "Meta x Saldo",
    searchText: "meta saldo progresso valor alvo atual restante reservado viagem guardar lançamento",
    content: <><p>Criar uma meta não movimenta dinheiro. Adicionar progresso também não cria automaticamente uma entrada ou saída.</p><Example>Meta Viagem: R$ 5.000. Progresso: R$ 1.500. Isso informa quanto você considera já reservado, sem alterar o saldo.</Example></>,
  },
  {
    id: "data-prevista-realizacao",
    title: "Data prevista x Data de realização",
    searchText: "data prevista vencimento realização pagamento calendário mês relatório análise agosto setembro",
    content: <><p>A data prevista ou o vencimento define o Calendário, o mês do lançamento, os relatórios e as análises. A data em que você marca como paga ou recebida não muda esse mês financeiro.</p><Example>Uma conta que vence em 31/08 e é paga em 02/09 continua no relatório de agosto.</Example></>,
  },
  {
    id: "calendario-lancamentos",
    title: "Calendário x Lançamentos",
    searchText: "calendário lançamentos listar filtrar editar data vencimento registros",
    content: <Comparison leftTitle="Lançamentos" left="Melhor para listar, filtrar, editar e acompanhar registros e parcelas." rightTitle="Calendário" right="Melhor para visualizar quando entradas, saídas e vencimentos acontecem." />,
  },
  {
    id: "visao-relatorios",
    title: "Visão geral x Relatórios",
    searchText: "visão geral dashboard relatórios histórico período saldo resumo entradas saídas categorias",
    content: <Comparison leftTitle="Visão geral" left="Uma leitura rápida do saldo disponível, do mês e dos próximos vencimentos." rightTitle="Relatórios" right="Uma análise histórica de 3, 6 ou 12 meses, com resultados e categorias." />,
  },
]

const GUIDES: HelpItem[] = [
  {
    id: "lancamentos",
    title: "Lançamentos",
    searchText: "lançamentos recorrentes compras parceladas parcelas filtros futuro pago pendente receita despesa",
    content: <><p>Um lançamento registra uma receita ou despesa. Você escolhe sua situação, data, categoria e, para despesas, uma prioridade opcional.</p><p>Compras parceladas criam todas as parcelas de uma vez. Cada uma possui vencimento e situação próprios. Nos filtros, você pode combinar tipo, categoria, situação, recorrência, parcelamento e período; ative “Visualizar lançamentos futuros” para consultar os próximos meses.</p></>,
  },
  {
    id: "gastos-fixos",
    title: "Gastos fixos",
    searchText: "gastos fixos mensal cobrança ocorrências editar excluir pendentes histórico concluídas aluguel assinatura",
    content: <><p>Use para despesas mensais habituais, como aluguel ou academia. Alguns lançamentos futuros podem ser gerados automaticamente a partir desses cadastros.</p><p>Ao editar, as ocorrências pendentes vinculadas podem receber o novo nome, valor, categoria e dia. Ao excluir, as pendentes vinculadas podem ser removidas; as concluídas permanecem no histórico.</p></>,
  },
  {
    id: "metas",
    title: "Metas",
    searchText: "metas valor alvo atual restante prazo progresso status andamento concluída atrasada saldo lançamento",
    content: <><p>O valor alvo é o objetivo; o valor atual é quanto você informa já ter reservado; o restante é o que falta. O prazo é opcional.</p><p>A meta fica Em andamento, Concluída ou Atrasada conforme valor e prazo. Meta e progresso não alteram o saldo nem criam lançamentos.</p></>,
  },
  {
    id: "calendario",
    title: "Calendário",
    searchText: "calendário data prevista vencimento concluído pendente dia situação adicionar recorrências gastos fixos",
    content: <><p>Organiza receitas, despesas e vencimentos pela data prevista. Mostra concluídos e pendentes, permite consultar os registros do dia, mudar a situação e adicionar um lançamento.</p><p>Alguns lançamentos futuros podem ser gerados automaticamente a partir das recorrências e gastos fixos cadastrados.</p></>,
  },
  {
    id: "relatorios",
    title: "Relatórios",
    searchText: "relatórios 3 6 12 meses receitas despesas resultado evolução categorias concluídos vencimento",
    content: <><p>Escolha 3, 6 ou 12 meses para ver receitas, despesas, resultado e gastos por categoria. Acompanhe a evolução dos resultados ao longo do período selecionado.</p><p>Os relatórios consideram lançamentos concluídos e usam a data prevista ou o vencimento.</p></>,
  },
  {
    id: "assistente",
    title: "Assistente Contaí",
    searchText: "assistente consultar analisar criar alterar proposta confirmação simulação planejamento pendentes metas gastos fixos",
    content: <AssistantGuide />,
  },
  {
    id: "confirmacao-assistente",
    title: "Confirmação do Assistente",
    searchText: "assistente confirmação confirmar cancelar proposta expira 10 minutos mercado criar lançamento",
    content: <><ol className="space-y-2" aria-label="Etapas da confirmação">{["Você pede a alteração.", "O Assistente prepara uma proposta.", "Você revisa os dados.", "Escolhe Confirmar ou Cancelar.", "Somente Confirmar executa a alteração."].map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-semibold text-foreground">{index + 1}</span><span>{step}</span></li>)}</ol><p>As propostas expiram após 10 minutos.</p><Example>“Gastei R$ 80 no mercado.” O Assistente prepara o lançamento; depois da sua revisão e confirmação, ele é criado.</Example></>,
  },
]

export const FAQS: HelpItem[] = [
  ["faq-lancamento", "O que é um lançamento?", "É o registro de uma entrada ou saída específica, com valor, categoria, situação e data.", "lançamento entrada saída receita despesa"],
  ["faq-status", "Quando devo marcar como pago ou pendente?", "Marque como paga ou recebida quando o dinheiro já saiu ou entrou. Deixe pendente ou a receber enquanto a movimentação ainda for prevista.", "pago paga pendente concluído recebida receber saldo"],
  ["faq-receita-saldo", "Quando uma receita entra no saldo?", "Quando ela está marcada como recebida. Uma receita a receber continua prevista e não aumenta o saldo disponível.", "receita recebida a receber saldo disponível"],
  ["faq-lancamento-fixo", "Qual é a diferença entre lançamento e gasto fixo?", "Lançamento é uma movimentação específica. Gasto fixo é uma despesa mensal habitual com dia de cobrança.", "lançamento gasto fixo mensal academia mercado"],
  ["faq-fixo-recorrencia", "Qual é a diferença entre gasto fixo e recorrência?", "Gasto fixo é apenas despesa mensal. Recorrência pode ser receita ou despesa, semanal ou mensal, usando um lançamento como referência.", "gasto fixo recorrência semanal mensal receita despesa"],
  ["faq-recorrente-parcelado", "Qual é a diferença entre recorrente e parcelado?", "Recorrente não tem quantidade final definida. Parcelado termina depois do número de parcelas escolhido.", "recorrente parcelado assinatura parcela quantidade"],
  ["faq-compra-parcelada", "Como funciona uma compra parcelada?", "O Contaí cria de 2 a 120 parcelas mensais e preserva o valor total da compra. Cada parcela tem data, valor e situação próprios.", "compra parcelada 2 120 parcelas valor total"],
  ["faq-parcela-separada", "Posso controlar cada parcela separadamente?", "Sim. Você pode abrir uma parcela e mudar sua situação individualmente. O detalhe também mostra o parcelamento completo.", "parcela separadamente situação parcelamento completo"],
  ["faq-editar-fixo", "O que acontece ao editar ou excluir um gasto fixo?", "A edição pode atualizar ocorrências pendentes vinculadas. Na exclusão, as pendentes vinculadas podem ser removidas; as concluídas permanecem no histórico.", "editar excluir gasto fixo pendentes concluídas histórico"],
  ["faq-meta-saldo", "Uma meta altera meu saldo?", "Não. Criar, editar ou excluir uma meta não movimenta dinheiro e não cria lançamentos.", "meta saldo lançamento dinheiro"],
  ["faq-meta-progresso", "O que significa progresso da meta?", "É o valor que você informa considerar já reservado. Ele aumenta o valor atual da meta, mas não altera o saldo.", "progresso meta valor atual reservado saldo"],
  ["faq-data-relatorio", "Qual data é usada nos relatórios?", "A data prevista ou o vencimento. Marcar o lançamento como concluído em outro dia não muda seu mês financeiro.", "data relatório vencimento prevista realização mês"],
  ["faq-calendario-lancamentos", "Devo usar Calendário ou Lançamentos?", "Use Lançamentos para listar, filtrar e editar. Use o Calendário para visualizar os registros em cada data.", "calendário lançamentos listar filtrar editar data"],
  ["faq-visao-relatorios", "Devo usar Visão geral ou Relatórios?", "Use a Visão geral para uma posição rápida. Use Relatórios para analisar resultados e categorias em períodos maiores.", "visão geral relatórios posição histórico período"],
  ["faq-assistente-altera", "O Assistente altera meus dados automaticamente?", "Não. Ele prepara uma proposta para você revisar. Somente Confirmar executa a alteração; Cancelar não muda seus dados.", "assistente automaticamente proposta confirmar cancelar"],
  ["faq-simulacoes", "O Assistente consegue fazer simulações hoje?", "Ainda não. Recursos de planejamento, saldo projetado, simulação de compras e impacto sobre metas não estão disponíveis no Assistente Contaí.", "assistente simulação planejamento saldo projetado compra meta indisponível"],
].map(([id, title, answer, searchText]) => ({ id, title, content: <p>{answer}</p>, searchText }))

export function normalizeHelpText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim()
}

export function matchesHelpItem(item: Pick<HelpItem, "title" | "searchText">, query: string) {
  const terms = normalizeHelpText(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const haystack = normalizeHelpText(`${item.title} ${item.searchText}`)
  return terms.every((term) => haystack.includes(term))
}

export function toggleHelpItem(openIds: ReadonlySet<string>, id: string) {
  const next = new Set(openIds)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function helpScrollBehavior(reducedMotion: boolean): ScrollBehavior {
  return reducedMotion ? "auto" : "smooth"
}

export default function HelpPage() {
  const [query, setQuery] = useState("")
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const filteredDifferences = useMemo(() => DIFFERENCES.filter((item) => matchesHelpItem(item, query)), [query])
  const filteredGuides = useMemo(() => GUIDES.filter((item) => matchesHelpItem(item, query)), [query])
  const filteredFaqs = useMemo(() => FAQS.filter((item) => matchesHelpItem(item, query)), [query])
  const searching = normalizeHelpText(query).length > 0
  const resultCount = filteredDifferences.length + filteredGuides.length + filteredFaqs.length

  function toggle(id: string) {
    setOpenIds((current) => toggleHelpItem(current, id))
  }

  function openEssential(id: string) {
    setOpenIds((current) => new Set(current).add(id))
    window.requestAnimationFrame(() => {
      const target = document.getElementById(id)
      const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
      target?.scrollIntoView({ behavior: helpScrollBehavior(reducedMotion), block: "start" })
      target?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true })
    })
  }

  return <div className="animate-in">
    <PageHeader title="Ajuda" subtitle="Entenda como o Contaí organiza seus lançamentos, metas e finanças." />

    <section aria-labelledby="help-search-label" className="mb-8">
      <label id="help-search-label" htmlFor="help-search" className="mb-2 block text-sm font-medium text-foreground">Como podemos ajudar?</label>
      <div className="relative max-w-2xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-subtle" aria-hidden />
        <Input id="help-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Busque por saldo, parcelado, metas..." className="h-12 pl-12 pr-12 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none" />
        {query && <button type="button" onClick={() => setQuery("")} className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Limpar busca"><X className="h-4 w-4" aria-hidden /></button>}
      </div>
      <p className="mt-2 text-xs text-subtle" aria-live="polite">{searching ? `${resultCount} ${resultCount === 1 ? "resultado encontrado" : "resultados encontrados"}.` : "Pesquise nos tópicos, diferenças e perguntas frequentes."}</p>
    </section>

    {!searching && <section aria-labelledby="essenciais-title" className="mb-10">
      <SectionTitle id="essenciais-title" icon={<CircleHelp />}>Respostas essenciais</SectionTitle>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ESSENTIALS.map(({ title, target, description, icon: Icon }) => <button type="button" key={title} onClick={() => openEssential(target)} className="group flex min-h-28 items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4 text-left transition-[background-color,border-color] hover:border-border-strong hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-muted group-hover:text-foreground"><Icon className="h-[18px] w-[18px]" aria-hidden /></span><span className="min-w-0"><strong className="block text-sm font-semibold leading-5 text-foreground">{title}</strong><span className="mt-1 block text-xs leading-5 text-muted">{description}</span></span><ArrowRight className="ml-auto mt-2 h-4 w-4 shrink-0 text-subtle" aria-hidden /></button>)}
      </div>
    </section>}

    {searching && resultCount === 0 ? <Card elevated={false} className="py-10 text-center"><Search className="mx-auto h-6 w-6 text-subtle" aria-hidden /><h2 className="mt-3 font-semibold text-foreground">Nenhum resultado encontrado</h2><p className="mt-1 text-sm text-muted">Tente buscar por uma palavra mais curta, como “saldo”, “meta” ou “parcela”.</p><button type="button" onClick={() => setQuery("")} className="mt-4 min-h-11 rounded-xl px-4 text-sm font-semibold text-primary underline underline-offset-4">Limpar busca</button></Card> : <div className="grid items-start gap-10 lg:grid-cols-[11rem_minmax(0,1fr)]">
      {!searching && <nav className="sticky top-8 hidden space-y-1 lg:block" aria-label="Nesta página"><p className="mb-3 text-xs font-semibold text-foreground">Nesta página</p>{[["differences-title", "Diferenças"], ["guides-title", "Como usar"], ["faq-title", "Perguntas frequentes"]].map(([href, label]) => <a key={href} href={`#${href}`} className="block rounded-lg px-2 py-2 text-xs text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{label}</a>)}</nav>}
      <div className={cn("min-w-0 space-y-12", searching && "lg:col-start-2")}>
        {filteredDifferences.length > 0 && <HelpSection title="Entenda as diferenças" id="differences-title" icon={<ListFilter />} description="Escolha o cadastro certo e entenda como cada informação afeta seus números."><AccordionList items={filteredDifferences} openIds={openIds} onToggle={toggle} forceOpen={searching} /></HelpSection>}
        {filteredGuides.length > 0 && <HelpSection title="Como usar o Contaí" id="guides-title" icon={<FileText />} description="Orientações diretas sobre as principais áreas do aplicativo."><AccordionList items={filteredGuides} openIds={openIds} onToggle={toggle} forceOpen={searching} /></HelpSection>}
        {filteredFaqs.length > 0 && <HelpSection title="Perguntas frequentes" id="faq-title" icon={<CircleHelp />} description="Respostas rápidas para as dúvidas mais comuns."><AccordionList items={filteredFaqs} openIds={openIds} onToggle={toggle} forceOpen={searching} /></HelpSection>}
      </div>
    </div>}
  </div>
}

function HelpSection({ title, id, icon, description, children }: { title: string; id: string; icon: ReactNode; description: string; children: ReactNode }) {
  return <section aria-labelledby={id} className="scroll-mt-6"><SectionTitle id={id} icon={icon}>{title}</SectionTitle><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{description}</p><div className="mt-4">{children}</div></section>
}

function SectionTitle({ id, icon, children }: { id: string; icon: ReactNode; children: ReactNode }) {
  return <div className="flex items-center gap-2.5"><span className="text-primary [&>svg]:h-5 [&>svg]:w-5" aria-hidden>{icon}</span><h2 id={id} className="text-lg font-semibold tracking-[-0.015em] text-foreground sm:text-xl">{children}</h2></div>
}

function AccordionList({ items, openIds, onToggle, forceOpen }: { items: HelpItem[]; openIds: ReadonlySet<string>; onToggle: (id: string) => void; forceOpen: boolean }) {
  return <div className="divide-y divide-border border-y border-border">{items.map((item) => {
    const open = forceOpen || openIds.has(item.id)
    const panelId = `${item.id}-panel`
    return <article key={item.id} id={item.id} className="scroll-mt-24 lg:scroll-mt-8"><h3>{forceOpen ? <span className="flex min-h-14 w-full items-center px-1 py-4 text-sm font-semibold text-foreground sm:text-base">{item.title}</span> : <button type="button" onClick={() => onToggle(item.id)} aria-expanded={open} aria-controls={panelId} className="flex min-h-14 w-full items-center justify-between gap-4 px-1 py-4 text-left text-sm font-semibold text-foreground transition-colors hover:text-primary focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-base"><span>{item.title}</span><ChevronDown className={cn("h-4 w-4 shrink-0 text-subtle transition-transform", open && "rotate-180")} aria-hidden /></button>}</h3>{open && <div id={panelId} className="max-w-3xl space-y-3 pb-5 pr-8 text-sm leading-6 text-muted">{item.content}</div>}</article>
  })}</div>
}

function Comparison({ leftTitle, left, rightTitle, right }: { leftTitle: string; left: string; rightTitle: string; right: string }) {
  return <div className="grid gap-2 sm:grid-cols-2"><div className="rounded-xl bg-surface-2 p-3"><strong className="text-foreground">{leftTitle}</strong><p className="mt-1 text-xs leading-5">{left}</p></div><div className="rounded-xl bg-surface-2 p-3"><strong className="text-foreground">{rightTitle}</strong><p className="mt-1 text-xs leading-5">{right}</p></div></div>
}

function Example({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-5 text-muted"><strong className="text-foreground">Exemplo: </strong>{children}</p>
}

function Warning({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-warning-soft px-3 py-2.5 text-xs leading-5 text-warning"><strong>Atenção: </strong>{children}</p>
}

function AssistantGuide() {
  return <div className="space-y-4"><div className="grid gap-2 sm:grid-cols-3"><GuideBlock icon={<Search />} title="Consultar">“Quais contas estão pendentes?”<br />“Como estão minhas metas?”</GuideBlock><GuideBlock icon={<FileText />} title="Analisar">“Quanto gastei em agosto?”<br />“Quais foram meus maiores gastos?”</GuideBlock><GuideBlock icon={<CheckCircle2 />} title="Criar ou alterar">Pode preparar lançamentos, situações, metas, progressos, gastos fixos e recorrências.</GuideBlock></div><p>Análises consideram lançamentos concluídos e usam a data prevista ou o vencimento. Alterações nunca são automáticas: você revisa e confirma antes.</p><Warning>Recursos de planejamento e simulação ainda não estão disponíveis no Assistente Contaí.</Warning></div>
}

function GuideBlock({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return <div className="rounded-xl bg-surface-2 p-3"><span className="text-muted [&>svg]:h-4 [&>svg]:w-4" aria-hidden>{icon}</span><strong className="mt-2 block text-xs text-foreground">{title}</strong><p className="mt-1 text-xs leading-5">{children}</p></div>
}
