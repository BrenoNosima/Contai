PASSWORD_POLICY_MESSAGE = (
    "A senha deve ter de 8 a 128 caracteres e incluir letra maiúscula, "
    "letra minúscula, número e caractere especial."
)

def validate_password_strength(password: str) -> str:
    valid = (
        8 <= len(password) <= 128
        and any(char.isupper() for char in password)
        and any(char.islower() for char in password)
        and any(char.isdigit() for char in password)
        and any(not char.isalnum() and not char.isspace() for char in password)
        and not any(char.isspace() for char in password)
    )
    if not valid:
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    return password
