import base64
from unittest.mock import MagicMock, patch

import pytest
from cryptography.fernet import Fernet

from llm_eval.utils.encrypter import decrypt, encrypt


@pytest.fixture
def hex_key() -> str:
    """Returns a valid hex-encoded key."""
    return "34614d1d76c0e2d2e94f87948f2325324a352a6948963c0ce20e9691b9ea1559"


@pytest.fixture
def base64_key() -> str:
    """Returns a valid base64-encoded key."""
    return Fernet.generate_key().decode()


@pytest.fixture
def test_data() -> str:
    """Returns test data to encrypt/decrypt."""
    return "test_secret_data"


@patch("llm_eval.utils.encrypter.SETTINGS.encryption_key.get_secret_value")
def test_encrypt_decrypt_with_hex_key(
    mock_get_secret_value: MagicMock, hex_key: str, test_data: str
) -> None:
    """Test encryption and decryption using a hex-encoded key."""
    key_bytes = base64.urlsafe_b64encode(bytes.fromhex(hex_key))
    mock_get_secret_value.return_value = key_bytes
    encrypted = encrypt(test_data)
    assert encrypted != test_data
    assert isinstance(encrypted, str)
    decrypted = decrypt(encrypted)
    assert decrypted == test_data


@patch("llm_eval.utils.encrypter.SETTINGS.encryption_key.get_secret_value")
def test_encrypt_decrypt_with_base64_key(
    mock_get_secret_value: MagicMock, base64_key: str, test_data: str
) -> None:
    """Test encryption and decryption using a base64-encoded key."""
    key_bytes = base64_key.encode()
    mock_get_secret_value.return_value = key_bytes
    encrypted = encrypt(test_data)
    assert encrypted != test_data
    assert isinstance(encrypted, str)
    decrypted = decrypt(encrypted)
    assert decrypted == test_data


@patch("llm_eval.utils.encrypter.SETTINGS.encryption_key.get_secret_value")
def test_encrypt_decrypt_with_invalid_key(mock_get_secret_value: MagicMock) -> None:
    """Test that invalid keys raise appropriate errors."""
    mock_get_secret_value.return_value = b"invalid_key"
    with pytest.raises(ValueError):
        encrypt("test_data")


@patch("llm_eval.utils.encrypter.SETTINGS.encryption_key.get_secret_value")
def test_encrypt_decrypt_with_empty_key(mock_get_secret_value: MagicMock) -> None:
    """Test that empty keys raise appropriate errors."""
    mock_get_secret_value.return_value = b""
    with pytest.raises(ValueError):
        encrypt("test_data")


@patch("llm_eval.utils.encrypter.SETTINGS.encryption_key.get_secret_value")
def test_encrypt_decrypt_with_special_characters(
    mock_get_secret_value: MagicMock, test_data: str, base64_key: str
) -> None:
    key_bytes = base64_key.encode()
    mock_get_secret_value.return_value = key_bytes
    special_data = "!@#$%^&*()_+{}|:<>?[]\\;',./~`"
    encrypted = encrypt(special_data)
    decrypted = decrypt(encrypted)
    assert decrypted == special_data


@patch("llm_eval.utils.encrypter.SETTINGS.encryption_key.get_secret_value")
def test_encrypt_decrypt_with_unicode(
    mock_get_secret_value: MagicMock, test_data: str, base64_key: str
) -> None:
    key_bytes = base64_key.encode()
    mock_get_secret_value.return_value = key_bytes
    unicode_data = "Hello, 世界! 🌍"
    encrypted = encrypt(unicode_data)
    decrypted = decrypt(encrypted)
    assert decrypted == unicode_data
