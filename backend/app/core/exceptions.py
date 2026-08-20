class ApplicationError(Exception):
    """Erro conhecido que pode ser traduzido com segurança pela API."""


class DomainValidationError(ApplicationError):
    """A operação viola uma regra de negócio da aplicação."""


class PersistenceConflictError(ApplicationError):
    """A operação viola uma restrição de integridade do banco."""


class PersistenceUnavailableError(ApplicationError):
    """O banco não conseguiu concluir uma operação de persistência."""
