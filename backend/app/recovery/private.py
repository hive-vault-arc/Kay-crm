"""Windows user-bound authenticated encryption; no portable or public backup keys."""

import ctypes
import hashlib
import os
import re
import struct
import subprocess
from ctypes import wintypes
from pathlib import Path

from app.runtime import BACKEND_ROOT


class RecoveryError(RuntimeError):
    pass


def guard(path: Path, root: Path) -> None:
    if not path.resolve().is_relative_to(root.resolve()):
        raise RecoveryError("RECOVERY_PATH_REFUSED")
    for parent in (path, *path.parents):
        if parent.is_symlink() or (
            parent.exists() and getattr(parent.stat(), "st_file_attributes", 0) & 0x400
        ):
            raise RecoveryError("RECOVERY_REPARSE_REFUSED")
        if parent == BACKEND_ROOT:
            break


def protect_directory(path: Path) -> None:
    guard(path, BACKEND_ROOT / ".local-data")
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    binary = Path(os.environ["SystemRoot"]) / "System32" / "whoami.exe"
    sid = re.search(
        r"S-1-5-21-[0-9-]+",
        subprocess.run(  # noqa: S603 - fixed Windows binary, no shell or user arguments.
            [str(binary), "/user", "/fo", "csv", "/nh"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        ).stdout,
    )
    if not sid:
        raise RecoveryError("BACKUP_ACL_REFUSED")
    advapi = ctypes.windll.advapi32
    convert = advapi.ConvertStringSecurityDescriptorToSecurityDescriptorW
    convert.argtypes = [
        wintypes.LPCWSTR,
        wintypes.DWORD,
        ctypes.POINTER(ctypes.c_void_p),
        ctypes.POINTER(wintypes.DWORD),
    ]
    convert.restype = wintypes.BOOL
    descriptor = ctypes.c_void_p()
    if not convert(f"D:P(A;OICI;FA;;;SY)(A;OICI;FA;;;{sid[0]})", 1, ctypes.byref(descriptor), None):
        raise RecoveryError("BACKUP_ACL_REFUSED")
    try:
        setter = advapi.SetFileSecurityW
        setter.argtypes = [wintypes.LPCWSTR, wintypes.DWORD, ctypes.c_void_p]
        setter.restype = wintypes.BOOL
        if not setter(str(path), 0x80000004, descriptor):
            raise RecoveryError("BACKUP_ACL_REFUSED")
    finally:
        release(descriptor)


def release(pointer: ctypes.c_void_p) -> None:
    free = ctypes.windll.kernel32.LocalFree
    free.argtypes, free.restype = [ctypes.c_void_p], ctypes.c_void_p
    free(pointer)


class Blob(ctypes.Structure):
    _fields_ = [("size", wintypes.DWORD), ("data", ctypes.POINTER(ctypes.c_char))]


def crypt(data: bytes, context: bytes, *, encrypt: bool) -> bytes:
    source, entropy = ctypes.create_string_buffer(data), ctypes.create_string_buffer(context)
    incoming = Blob(len(data), ctypes.cast(source, ctypes.POINTER(ctypes.c_char)))
    salt = Blob(len(context), ctypes.cast(entropy, ctypes.POINTER(ctypes.c_char)))
    outgoing = Blob()
    method = getattr(ctypes.windll.crypt32, "CryptProtectData" if encrypt else "CryptUnprotectData")
    if not method(
        ctypes.byref(incoming), None, ctypes.byref(salt), None, None, 1, ctypes.byref(outgoing)
    ):
        raise RecoveryError("BACKUP_DECRYPTION_REFUSED")
    try:
        return ctypes.string_at(outgoing.data, outgoing.size)
    finally:
        release(ctypes.cast(outgoing.data, ctypes.c_void_p))


def seal(source: Path, target: Path, context: bytes) -> dict[str, object]:
    digest, size = hashlib.sha256(), 0
    with source.open("rb") as reader, target.open("xb") as writer:
        index = 0
        while chunk := reader.read(65536):
            digest.update(chunk)
            size += len(chunk)
            encrypted = crypt(chunk, context + str(index).encode(), encrypt=True)
            writer.write(struct.pack("!I", len(encrypted)) + encrypted)
            index += 1
        writer.flush()
        os.fsync(writer.fileno())
    return {"size": size, "sha256": digest.hexdigest(), "chunks": index}


def unseal(source: Path, target: Path, context: bytes, fact: dict[str, object]) -> None:
    digest, size, index = hashlib.sha256(), 0, 0
    with source.open("rb") as reader, target.open("xb") as writer:
        while header := reader.read(4):
            if len(header) != 4 or not 1 <= (length := struct.unpack("!I", header)[0]) <= 70000:
                raise RecoveryError("BACKUP_INTEGRITY_REFUSED")
            chunk = reader.read(length)
            if len(chunk) != length:
                raise RecoveryError("BACKUP_INTEGRITY_REFUSED")
            plain = crypt(chunk, context + str(index).encode(), encrypt=False)
            if len(plain) > 65536:
                raise RecoveryError("BACKUP_INTEGRITY_REFUSED")
            writer.write(plain)
            digest.update(plain)
            size += len(plain)
            index += 1
    if (size, digest.hexdigest(), index) != (fact["size"], fact["sha256"], fact["chunks"]):
        raise RecoveryError("BACKUP_INTEGRITY_REFUSED")
