"""Corning Active Directory / LDAP credential verification.

Exposes a single predicate, check_account_and_password, that returns True
only when the supplied NT account and password successfully bind against
ap.corning.com. Any other outcome (wrong password, network error,
malformed input) returns False so callers can treat it as a boolean.

Pin ldap3==2.9.1 and pyasn1==0.5.1 - newer ldap3 releases have broken APIs
for some users inside the Corning network.
"""

from __future__ import annotations

import logging

from ldap3 import ALL, Connection, Server, core

logger = logging.getLogger(__name__)

_AD_HOST = "ap.corning.com"
_AD_DOMAIN = "corning.com"


def check_account_and_password(account: str, password: str) -> bool:
    """Verify a Corning NT account + password pair against Active Directory.

    account: NT account only (e.g. ``wangm44``). The function strips any
    accidentally-included ``@corning.com`` suffix before binding.
    password: plaintext password; never log or persist.
    Returns True only when the LDAP bind succeeds; False for any failure.
    """
    if not account or not password:
        return False

    account = account.strip().split("@", 1)[0]
    ldap_user = f"{account}@{_AD_DOMAIN}"

    server = Server(f"LDAP://{_AD_HOST}", get_info=ALL)

    try:
        conn = Connection(server, ldap_user, password, auto_bind=False)
        conn.open()
        conn.bind()
        try:
            return bool(conn.bound and conn.result.get("description") == "success")
        finally:
            conn.unbind()
    except core.exceptions.LDAPBindError as exc:
        logger.warning("LDAP bind failed for %s: %s", account, exc)
        return False
    except Exception:
        logger.exception("Unexpected LDAP error for %s", account)
        return False
