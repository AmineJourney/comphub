import base64
import hashlib
import hmac
from uuid import UUID

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


class EncryptionError(Exception):
    """Raised when encryption or decryption fails."""


def _normalize_company_id(company_id) -> str:
    if isinstance(company_id, UUID):
        return str(company_id)
    return str(company_id)


def derive_company_key(company_id) -> bytes:
    """
    Derive a stable per-company Fernet key from the app master key and company ID.
    """
    master_key = settings.APP_ENCRYPTION_MASTER_KEY.encode("utf-8")
    company_bytes = _normalize_company_id(company_id).encode("utf-8")
    digest = hmac.new(master_key, company_bytes, hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest)


def get_company_fernet(company_id) -> Fernet:
    return Fernet(derive_company_key(company_id))


def encrypt_for_company(company_id, plaintext: bytes) -> bytes:
    if plaintext is None:
        raise EncryptionError("Plaintext is required for encryption.")
    return get_company_fernet(company_id).encrypt(plaintext)


def decrypt_for_company(company_id, ciphertext: bytes) -> bytes:
    if ciphertext is None:
        raise EncryptionError("Ciphertext is required for decryption.")
    try:
        return get_company_fernet(company_id).decrypt(ciphertext)
    except InvalidToken as exc:
        raise EncryptionError("Unable to decrypt data for this company.") from exc
