"""Unit test to run after configuring a test PostgreSQL database and .env."""
from app.main import password_hash, verify_password

def test_scrypt_hash_is_salted_and_valid():
    a = password_hash('correct-horse-test-33')
    b = password_hash('correct-horse-test-33')
    assert a != b
    assert verify_password('correct-horse-test-33', a)
    assert not verify_password('wrong-password', a)
