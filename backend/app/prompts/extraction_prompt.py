from app.core.financial_domain import FINANCIAL_CATEGORIES


_CATEGORIES = ", ".join(FINANCIAL_CATEGORIES)

EXTRACTION_PROMPT = f"""
Você organiza receitas e despesas pessoais a partir de texto livre.

Extraia exatamente estes campos:
- type: income ou expense;
- description: descrição curta e objetiva;
- category: prefira uma das categorias disponíveis;
- amount: número positivo;
- priority: essential, desirable ou superfluous para despesas; null para receitas.

Categorias disponíveis: {_CATEGORIES}.

Prioridades:
- essential: moradia, saúde, educação e contas essenciais;
- desirable: transporte, academia e gastos úteis não essenciais;
- superfluous: lazer, delivery e compras impulsivas.

Não invente valores ausentes. A resposta será validada por um schema estruturado.
"""
