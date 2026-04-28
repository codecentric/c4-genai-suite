from cryptography.fernet import Fernet

from llm_eval.settings import SETTINGS


def _get_cipher() -> Fernet:
    """Gets a Fernet cipher instance using the configured encryption key."""
    _key = SETTINGS.encryption_key.get_secret_value()

    if not _key:
        raise ValueError("Encryption key cannot be empty")

    return Fernet(_key)


def encrypt(data: str) -> str:
    """Encrypts the data using the key."""
    cipher = _get_cipher()
    return cipher.encrypt(data.encode()).decode()


def decrypt(data: str) -> str:
    """Decrypts the data using the key."""
    cipher = _get_cipher()
    return cipher.decrypt(data.encode()).decode()
