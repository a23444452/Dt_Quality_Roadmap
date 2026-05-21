"""Corning Active Directory / LDAP verification.

Two capabilities:
1. check_account_and_password — verify NT credentials via simple bind
2. check_ad_group_membership — verify AD Group membership via service account (NTLM)

Follows the Corning Platform Standard LDAP Guide:
- NTLM authentication with service account
- Recursive group membership check (OID 1.2.840.113556.1.4.1941)
- MD4 patch for Python 3.13 + OpenSSL 3.0

Pin ldap3==2.9.1 and pyasn1==0.5.1 - newer ldap3 releases have broken APIs
for some users inside the Corning network.
"""

from __future__ import annotations

import hashlib
import logging
import struct
from typing import Optional

# ==============================================================
# MD4 patch for Python 3.13 + OpenSSL 3.0
# NTLM authentication requires MD4, which is disabled by default
# ==============================================================
try:
    hashlib.new("md4")
except ValueError:
    class _MD4:
        block_size = 64
        digest_size = 16
        name = "md4"

        def __init__(self, data=b""):
            self._buffer = data

        def update(self, data):
            self._buffer += data

        def copy(self):
            clone = _MD4()
            clone._buffer = self._buffer[:]
            return clone

        def digest(self):
            return self._md4_hash(self._buffer)

        def hexdigest(self):
            return self.digest().hex()

        @staticmethod
        def _left_rotate(n, b):
            return ((n << b) | (n >> (32 - b))) & 0xFFFFFFFF

        def _md4_hash(self, message):
            msg = bytearray(message)
            orig_len = len(msg) * 8
            msg.append(0x80)
            while len(msg) % 64 != 56:
                msg.append(0)
            msg += struct.pack('<Q', orig_len)
            a0, b0, c0, d0 = 0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476
            for i in range(0, len(msg), 64):
                block = msg[i:i + 64]
                M = struct.unpack('<16I', block)
                a, b, c, d = a0, b0, c0, d0
                for k in range(16):
                    if k % 4 == 0: a = _MD4._left_rotate((a + ((b & c) | (~b & d)) + M[k]) & 0xFFFFFFFF, 3)
                    elif k % 4 == 1: d = _MD4._left_rotate((d + ((a & b) | (~a & c)) + M[k]) & 0xFFFFFFFF, 7)
                    elif k % 4 == 2: c = _MD4._left_rotate((c + ((d & a) | (~d & b)) + M[k]) & 0xFFFFFFFF, 11)
                    else: b = _MD4._left_rotate((b + ((c & d) | (~c & a)) + M[k]) & 0xFFFFFFFF, 19)
                for idx, k in enumerate([0, 4, 8, 12, 1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15]):
                    if idx % 4 == 0: a = _MD4._left_rotate((a + ((b & c) | (b & d) | (c & d)) + M[k] + 0x5A827999) & 0xFFFFFFFF, 3)
                    elif idx % 4 == 1: d = _MD4._left_rotate((d + ((a & b) | (a & c) | (b & c)) + M[k] + 0x5A827999) & 0xFFFFFFFF, 5)
                    elif idx % 4 == 2: c = _MD4._left_rotate((c + ((d & a) | (d & b) | (a & b)) + M[k] + 0x5A827999) & 0xFFFFFFFF, 9)
                    else: b = _MD4._left_rotate((b + ((c & d) | (c & a) | (d & a)) + M[k] + 0x5A827999) & 0xFFFFFFFF, 13)
                for idx, k in enumerate([0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15]):
                    if idx % 4 == 0: a = _MD4._left_rotate((a + (b ^ c ^ d) + M[k] + 0x6ED9EBA1) & 0xFFFFFFFF, 3)
                    elif idx % 4 == 1: d = _MD4._left_rotate((d + (a ^ b ^ c) + M[k] + 0x6ED9EBA1) & 0xFFFFFFFF, 9)
                    elif idx % 4 == 2: c = _MD4._left_rotate((c + (d ^ a ^ b) + M[k] + 0x6ED9EBA1) & 0xFFFFFFFF, 11)
                    else: b = _MD4._left_rotate((b + (c ^ d ^ a) + M[k] + 0x6ED9EBA1) & 0xFFFFFFFF, 15)
                a0 = (a0 + a) & 0xFFFFFFFF
                b0 = (b0 + b) & 0xFFFFFFFF
                c0 = (c0 + c) & 0xFFFFFFFF
                d0 = (d0 + d) & 0xFFFFFFFF
            return struct.pack('<4I', a0, b0, c0, d0)

    _original_hashlib_new = hashlib.new

    def _patched_hashlib_new(name, *args, **kwargs):
        if name.lower() == "md4":
            return _MD4(*args)
        return _original_hashlib_new(name, *args, **kwargs)

    hashlib.new = _patched_hashlib_new


from ldap3 import ALL, NTLM, SUBTREE, Connection, Server, core

from app.config import settings

logger = logging.getLogger(__name__)

_AD_HOST = "ap.corning.com"
_AD_DOMAIN = "corning.com"
_AD_SEARCH_BASE = "DC=ap,DC=corning,DC=com"


# ==============================================================
# Part 1: Password verification (simple bind)
# ==============================================================


def check_account_and_password(account: str, password: str) -> bool:
    """Verify a Corning NT account + password pair against Active Directory."""
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


# ==============================================================
# Part 2: AD Group membership check (service account + NTLM)
# Follows Platform Standard LDAP Guide
# ==============================================================


def _ldap_connect() -> Optional[Connection]:
    """Establish LDAP connection using service account (NTLM)."""
    ldap_user = settings.ldap_bind_dn
    ldap_password = settings.ldap_bind_password

    if not ldap_user or not ldap_password:
        logger.error("LDAP service account not configured (LDAP_BIND_DN / LDAP_BIND_PASSWORD)")
        return None

    try:
        server = Server(_AD_HOST, use_ssl=False, connect_timeout=3)
        conn = Connection(
            server,
            user=ldap_user,
            password=ldap_password,
            authentication=NTLM,
            auto_bind=True,
            receive_timeout=5,
        )
        return conn
    except Exception as exc:
        logger.error("LDAP connection failed: %s", exc)
        return None


def _find_user_dn(conn: Connection, sam_account: str) -> Optional[str]:
    """Find user's Distinguished Name."""
    conn.search(
        search_base=_AD_SEARCH_BASE,
        search_filter=f"(&(objectClass=user)(sAMAccountName={sam_account}))",
        search_scope=SUBTREE,
        attributes=["distinguishedName"],
    )
    if conn.entries:
        return str(conn.entries[0].distinguishedName)
    return None


def _find_group_dn(conn: Connection, group_name: str) -> Optional[str]:
    """Find group's Distinguished Name."""
    conn.search(
        search_base=_AD_SEARCH_BASE,
        search_filter=f"(&(objectClass=group)(cn={group_name}))",
        search_scope=SUBTREE,
        attributes=["distinguishedName"],
    )
    if conn.entries:
        return str(conn.entries[0].distinguishedName)
    return None


def check_ad_group_membership(username: str, required_group: str) -> bool:
    """Check whether a user belongs to the specified AD group.

    Uses recursive membership check (OID 1.2.840.113556.1.4.1941)
    to support nested groups.

    Returns True if user is in the group, False otherwise.
    """
    username = username.strip().split("@", 1)[0]

    conn = _ldap_connect()
    if conn is None:
        logger.error("Cannot verify AD group — LDAP unavailable")
        return False

    try:
        group_dn = _find_group_dn(conn, required_group)
        if not group_dn:
            logger.warning("AD Group not found: %s", required_group)
            conn.unbind()
            return False

        user_dn = _find_user_dn(conn, username)
        if not user_dn:
            logger.warning("User not found in AD: %s", username)
            conn.unbind()
            return False

        # Recursive membership check using LDAP_MATCHING_RULE_IN_CHAIN
        search_filter = (
            f"(&(objectClass=user)"
            f"(distinguishedName={user_dn})"
            f"(memberOf:1.2.840.113556.1.4.1941:={group_dn}))"
        )
        conn.search(
            search_base=_AD_SEARCH_BASE,
            search_filter=search_filter,
            search_scope=SUBTREE,
            attributes=["sAMAccountName"],
        )

        is_member = len(conn.entries) > 0
        logger.info("LDAP check: %s in %s = %s", username, required_group, is_member)
        conn.unbind()
        return is_member

    except Exception:
        logger.exception("LDAP check_ad_group_membership failed for %s", username)
        try:
            conn.unbind()
        except Exception:
            pass
        return False


def get_user_groups(username: str) -> list[str]:
    """Query all AD group memberships for a user."""
    username = username.strip().split("@", 1)[0]

    conn = _ldap_connect()
    if conn is None:
        return []

    try:
        conn.search(
            search_base=_AD_SEARCH_BASE,
            search_filter=f"(&(objectClass=user)(sAMAccountName={username}))",
            search_scope=SUBTREE,
            attributes=["memberOf"],
        )

        if not conn.entries:
            logger.warning("LDAP user not found: %s", username)
            conn.unbind()
            return []

        entry = conn.entries[0]
        member_of = entry["memberOf"].values if "memberOf" in entry else []
        groups = []
        for dn in member_of:
            if dn.startswith("CN="):
                cn = dn.split(",")[0].replace("CN=", "")
                groups.append(cn)

        conn.unbind()
        return groups
    except Exception:
        logger.exception("LDAP get_user_groups failed for %s", username)
        try:
            conn.unbind()
        except Exception:
            pass
        return []
