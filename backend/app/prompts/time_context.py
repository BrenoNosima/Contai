from calendar import monthrange
from datetime import timedelta


def build_request_time_context(today):
    start = today.replace(day=1)
    end = today.replace(day=monthrange(today.year, today.month)[1])
    previous_end = start - timedelta(days=1)
    next_start = end + timedelta(days=1)
    next_end = next_start.replace(day=monthrange(next_start.year, next_start.month)[1])
    return f"""Contexto temporal confiável, no fuso America/Sao_Paulo:
Hoje: {today.isoformat()}. Este mês: {start.isoformat()} a {end.isoformat()}.
Mês passado: {previous_end.replace(day=1).isoformat()} a {previous_end.isoformat()}.
Próximo mês: {next_start.isoformat()} a {next_end.isoformat()}.
Para saldo no fim deste mês, consulte de hoje ({today.isoformat()}) até {end.isoformat()}.
Não peça datas já resolvidas por estas referências. Datas explícitas prevalecem.
Em perguntas históricas, mês sem ano usa a ocorrência mais recente no passado.
Em planejamento futuro, mês sem ano usa a ocorrência atual ou seguinte, nunca um ano passado.
Datas selecionam argumentos das ferramentas; valores financeiros vêm somente dos serviços.
"""
