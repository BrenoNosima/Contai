class ApplicationError(Exception):
    """Erro conhecido que pode ser traduzido com segurança pela API."""


class PersistenceConflictError(ApplicationError):
    """A operação viola uma restrição de integridade do banco."""


class PersistenceUnavailableError(ApplicationError):
    """O banco não conseguiu concluir uma operação de persistência."""
