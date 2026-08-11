from langchain.agents import create_agent

from langchain_groq import ChatGroq

from app.core.config import GROQ_API_KEY
from app.tools.finance_tools import FINANCE_TOOLS


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
  para salvar.
- Se o usuário perguntar sobre saldo, extrato, gastos por categoria, metas,
  despesas fixas ou pedir um resumo geral, use a tool de consulta
  correspondente antes de responder. Nunca invente valores.
- Se o usuário pedir para criar uma meta ou despesa fixa, use a tool
  apropriada (create_goal / create_fixed_expense).
- Depois de usar uma tool, sempre confirme para o usuário o que foi feito
  ou encontrado, com os valores reais retornados pela tool.
- Responda sempre em português do Brasil, de forma direta e amigável.
- Formate valores monetários como R$ 0,00.
"""


class FinancialAgent:
    """
    Agente financeiro com tool-calling: usa um LLM (via Groq) que decide
    quando chamar as tools de app/tools/finance_tools.py, sincronizando
    a conversa diretamente com o banco de dados.
    """

    def __init__(self):

        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=str(GROQ_API_KEY),
            temperature=0,
        )

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

        result = self.agent.invoke(
            {
                "messages": messages,
            }
        )

        final_message = result["messages"][-1]

        return final_message.content