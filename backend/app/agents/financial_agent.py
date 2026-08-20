from langchain.agents import create_agent

from pydantic import ValidationError

from app.agents.llm import create_chat_model
from app.tools.registry import FINANCE_TOOLS


SYSTEM_PROMPT = """
Você é o Breno Finance AI, um assistente financeiro pessoal.

Você tem acesso a ferramentas (tools) que leem e escrevem diretamente no
banco de dados do usuário. Sempre que possível, use as ferramentas em vez
de responder de memória — os dados do banco são a única fonte confiável.

Regras:

- Se o usuário relatar uma receita ou despesa em texto livre
  (ex: "gastei 50 reais no mercado"), extraia tipo (income/expense),
  descrição curta, categoria, valor e, se for despesa, prioridade
  (essential, desirable ou superfluous), e use a tool create_transaction
  para salvar. Se ele mencionar uma data futura ou "todo mês"/"toda
  semana", preencha due_date e/ou is_recurring+recurrence.
- Se o usuário perguntar sobre saldo, extrato, gastos por categoria, metas,
  despesas fixas ou pedir um resumo geral, use a tool de consulta
  correspondente antes de responder. Nunca invente valores.
- Se o usuário quiser marcar uma conta como paga ou pendente, use
  mark_transaction_status (busque o id com search_transactions ou
  list_recent_transactions primeiro, se necessário).
- Para perguntas com filtros (categoria, período, status), use
  search_transactions em vez de list_recent_transactions.
- Para perguntas sobre tendência, evolução mensal ou comparação entre
  meses, use get_monthly_report. Para o detalhamento de um mês
  específico por categoria, use get_category_breakdown.
- Se o usuário pedir para "atualizar"/"projetar" as próximas cobranças
  recorrentes, use generate_recurring_occurrences.
- Se o usuário pedir para criar uma meta ou despesa fixa, use a tool
  apropriada (create_goal / create_fixed_expense). Metas podem ter prazo
  (deadline); se o usuário mencionar um prazo, preencha esse campo.
- Para saudações, agradecimentos, pedidos simples de formato ou conversa
  que não dependa de dados financeiros, responda normalmente sem chamar
  ferramentas. Não recuse instruções inofensivas e objetivas.
- Depois de usar uma tool, sempre confirme para o usuário o que foi feito
  ou encontrado, com os valores reais retornados pela tool.
- Responda sempre em português do Brasil, de forma direta e amigável.
- Nunca use emojis nas respostas. Mantenha um tom profissional e direto,
  como um extrato ou relatório financeiro.
- Formate valores monetários como R$ 0,00.
"""


class FinancialAgent:
    """
    Agente financeiro com tool-calling: usa um LLM (via Groq) que decide
    quando chamar as tools registradas em app/tools/registry.py, sincronizando
    a conversa diretamente com o banco de dados.
    """

    def __init__(self):

        self.llm = create_chat_model()

        self.tools = FINANCE_TOOLS

        # create_agent monta um grafo (LangGraph) que chama o modelo,
        # executa as tools que ele pedir e repete até chegar numa
        # resposta final em texto.
        self.agent = create_agent(
            model=self.llm,
            tools=self.tools,
            system_prompt=SYSTEM_PROMPT,
        )

    def ask(
        self,
        message: str,
        chat_history: list[dict] | None = None,
    ) -> str:
        """
        Envia uma mensagem ao agente e retorna a resposta final em texto,
        já refletindo qualquer leitura/escrita feita no banco de dados.

        chat_history (opcional): lista de mensagens anteriores no formato
        [{"role": "user"|"assistant", "content": "..."}] para dar contexto
        de conversas anteriores.
        """

        messages = list(chat_history or [])
        messages.append(
            {
                "role": "user",
                "content": message,
            }
        )

        try:
            result = self.agent.invoke(
                {
                    "messages": messages,
                }
            )
        except (ValueError, ValidationError):
            result = self.agent.invoke(
                {
                    "messages": [
                        *messages,
                        {
                            "role": "system",
                            "content": (
                                "A chamada anterior falhou por formatação de JSON "
                                "ou argumentos de tool. Tente novamente usando "
                                "argumentos válidos e datas no formato AAAA-MM-DD."
                            ),
                        },
                    ],
                }
            )

        final_message = result["messages"][-1]

        content = str(final_message.content)
        return content.replace("\u202f", " ").replace("\u00a0", " ")
