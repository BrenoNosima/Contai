import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ShieldCheck } from "lucide-react"
import { BrandLogo } from "@/components/brand-logo"
import { privacyApi, type PrivacyInformation } from "@/lib/api"

const fallback: PrivacyInformation = {
  controller: "Contaí (responsável a definir)", contact: "privacidade@example.invalid",
  country: "Brasil", ai_provider: "Groq", ai_destination: "Estados Unidos", policy_version: "2026-09-03",
}

export default function PrivacyPage() {
  const [info, setInfo] = useState(fallback)
  useEffect(() => { privacyApi.information().then(setInfo).catch(() => undefined) }, [])
  return (
    <main className="min-h-dvh bg-background px-4 py-8 text-foreground sm:px-6 sm:py-12">
      <article className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <BrandLogo imageClassName="w-28" />
          <Link to="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm text-muted hover:bg-surface hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden />Voltar</Link>
        </div>
        <header className="mb-10 border-b border-border pb-8">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="h-6 w-6" aria-hidden /></div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Política de Privacidade</h1>
          <p className="mt-3 text-sm text-muted">Versão {info.policy_version}</p>
        </header>
        <div className="space-y-9 text-[15px] leading-7 text-muted [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
          <section><h2>1. Quem trata seus dados</h2><p>O controlador é <strong className="text-foreground">{info.controller}</strong>, estabelecido em {info.country}. Solicitações sobre privacidade podem ser enviadas para <a className="text-primary underline underline-offset-4" href={`mailto:${info.contact}`}>{info.contact}</a>.</p></section>
          <section><h2>2. Dados e finalidades</h2><ul><li>Nome e e-mail: criar, identificar e administrar sua conta.</li><li>Senha protegida por hash e dados de sessão: autenticação, prevenção a fraude e segurança.</li><li>Transações, metas e despesas: organizar e apresentar sua vida financeira.</li><li>Mensagens e contexto do assistente: interpretar pedidos e responder às consultas.</li><li>Dados técnicos mínimos, como endereço IP temporário no limitador de requisições: segurança e prevenção a abuso.</li></ul></section>
          <section><h2>3. Bases legais</h2><p>Tratamos os dados necessários para executar o serviço solicitado e procedimentos relacionados ao contrato. Controles antifraude, segurança e registros necessários podem se apoiar no legítimo interesse ou no cumprimento de obrigações legais, após avaliação aplicável. Consentimento será solicitado separadamente apenas quando ele for a base adequada e poderá ser revogado.</p></section>
          <section><h2>4. Assistente e transferência internacional</h2><p>Quando você usa o assistente, a mensagem, o contexto recente e os dados financeiros necessários à resposta são processados pela {info.ai_provider}, como operadora. O destino informado é {info.ai_destination}. E-mails, CPFs e sequências semelhantes a cartão passam por ocultação defensiva, mas descrições e valores ainda podem ser processados. Evite inserir senhas, cartões, documentos, chaves PIX ou dados de terceiros. A transferência deve ser protegida pelo mecanismo contratual aplicável da LGPD e pelas configurações de retenção do provedor.</p></section>
          <section><h2>5. Retenção</h2><p>Dados da conta e financeiros permanecem enquanto a conta estiver ativa ou pelo período necessário à finalidade informada. Sessões e propostas expiradas do assistente são eliminadas conforme a tabela interna de retenção. Após exclusão, cópias de segurança seguem seu ciclo seguro de expiração, ressalvadas retenções exigidas por lei ou necessárias ao exercício de direitos.</p></section>
          <section><h2>6. Seus direitos</h2><p>Na área “Conta e privacidade”, você pode corrigir seus dados, baixar uma cópia estruturada e excluir a conta. Também pode solicitar confirmação e acesso, correção, informação sobre compartilhamentos, anonimização, bloqueio, eliminação, portabilidade e revisão quando aplicáveis. Você pode peticionar perante a ANPD se não houver solução pelo canal do controlador.</p></section>
          <section><h2>7. Segurança e incidentes</h2><p>Adotamos controles de autenticação, segregação por usuário, proteção contra requisições indevidas, conexão criptografada em produção e restrição de acesso. Nenhum sistema é infalível. Incidentes que possam causar risco ou dano relevante serão avaliados e comunicados à ANPD e aos titulares nos prazos aplicáveis.</p></section>
          <section><h2>8. Cookies e armazenamento local</h2><p>Usamos cookies estritamente necessários para autenticação, renovação de sessão e proteção CSRF. Eles não são usados para publicidade. A opção “lembrar meu e-mail” salva o e-mail apenas no armazenamento local do seu dispositivo e pode ser desativada na tela de login.</p></section>
          <section><h2>9. Atualizações</h2><p>Esta política poderá ser atualizada para refletir mudanças no serviço ou na legislação. Alterações relevantes serão destacadas no produto.</p></section>
        </div>
      </article>
    </main>
  )
}
