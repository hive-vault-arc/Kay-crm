"""A drained cross-process pause spans complete API streams and worker cycles."""

import ctypes
import json
import os
import threading
import time
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4

from sqlalchemy import Connection, create_engine, text
from sqlalchemy.pool import NullPool
from starlette.concurrency import run_in_threadpool
from starlette.types import ASGIApp, Receive, Scope, Send

from app.recovery.private import RecoveryError, guard, protect_directory
from app.runtime import BACKEND_ROOT
from app.settings import Settings

LOCK = 51502100


def flag(settings: Settings) -> Path:
    path = BACKEND_ROOT / ".local-data" / "maintenance" / (settings.app_environment + ".pause")
    guard(path, BACKEND_ROOT / ".local-data")
    return path


def ready_path() -> Path:
    path = BACKEND_ROOT / ".local-data" / "recovery" / "ready.json"
    guard(path, BACKEND_ROOT / ".local-data")
    return path


class Admission:
    def __init__(self, settings: Settings) -> None:
        self.settings, self.users = settings, 0
        self.mutex = threading.Lock()
        self.engine = create_engine(
            settings.selected_database_url(),
            poolclass=NullPool,
            hide_parameters=True,
            connect_args={"connect_timeout": 3},
        )
        self.connection: Connection | None = None
        self.code: str | None = None
        if settings.app_environment == "recovery":
            from app.recovery.snapshot import compatibility

            self.code = compatibility()

    def enter(self) -> bool:
        with self.mutex:
            if flag(self.settings).exists() or (
                self.settings.app_environment == "recovery" and not ready_path().is_file()
            ):
                return False
            if not self.users:
                self.connection = self.engine.connect()
                try:
                    if self.settings.app_environment == "recovery":
                        report = json.loads(ready_path().read_bytes())
                        identity = self.connection.execute(
                            text(
                                "SELECT system_identifier::text,d.oid::bigint "
                                "FROM pg_control_system(), "
                                "pg_database d WHERE d.datname=current_database()"
                            )
                        ).one()
                        if report["compatibility"] != self.code or report["target_identity"] != {
                            "cluster": identity[0],
                            "oid": identity[1],
                        }:
                            raise RecoveryError("RECOVERY_NOT_VERIFIED")
                    if not self.connection.scalar(
                        text("SELECT pg_try_advisory_lock_shared(:key)"), {"key": LOCK}
                    ):
                        raise RecoveryError("MAINTENANCE_ACTIVE")
                except Exception:
                    self.connection.close()
                    self.connection = None
                    return False
            self.users += 1
            return True

    def leave(self) -> None:
        with self.mutex:
            self.users -= 1
            if not self.users and self.connection:
                try:
                    self.connection.execute(
                        text("SELECT pg_advisory_unlock_shared(:key)"), {"key": LOCK}
                    )
                finally:
                    self.connection.close()
                    self.connection = None


class MaintenanceMiddleware:
    def __init__(self, app: ASGIApp, settings: Settings) -> None:
        self.app, self.admission = app, Admission(settings)

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") == "/api/v1/health/live":
            await self.app(scope, receive, send)
            return
        try:
            admitted = await run_in_threadpool(self.admission.enter)
            code = "MAINTENANCE"
        except Exception:
            admitted = False
            code = "DEPENDENCY_UNAVAILABLE"
        if not admitted:
            request_id = str(uuid4())
            body = json.dumps({"error": {"code": code, "request_id": request_id}}).encode()
            await send(
                {
                    "type": "http.response.start",
                    "status": 503,
                    "headers": [
                        (b"content-type", b"application/json"),
                        (b"cache-control", b"no-store"),
                        (b"retry-after", b"30"),
                        (b"x-request-id", request_id.encode()),
                        (b"x-content-type-options", b"nosniff"),
                    ],
                }
            )
            await send({"type": "http.response.body", "body": body})
            return
        try:
            await self.app(scope, receive, send)
        finally:
            await run_in_threadpool(self.admission.leave)


@contextmanager
def pause(settings: Settings) -> Iterator[Connection]:
    path = flag(settings)
    owner = json.dumps({"nonce": str(uuid4()), "pid": os.getpid()})
    protect_directory(path.parent)
    try:
        with path.open("x", encoding="utf8") as stream:
            stream.write(owner)
    except FileExistsError:
        raise RecoveryError("MAINTENANCE_ALREADY_ACTIVE") from None
    engine = create_engine(
        settings.selected_database_url(),
        poolclass=NullPool,
        hide_parameters=True,
        connect_args={"connect_timeout": 3},
    )
    try:
        with engine.connect() as connection:
            deadline = time.monotonic() + 15
            while not connection.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": LOCK}):
                if time.monotonic() > deadline:
                    raise RecoveryError("MAINTENANCE_DRAIN_TIMEOUT")
                time.sleep(0.05)
            try:
                yield connection
            finally:
                connection.rollback()
                connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": LOCK})
    finally:
        engine.dispose()
        if path.is_file() and path.read_text(encoding="utf8") == owner:
            path.unlink()


def resume(settings: Settings) -> None:
    path = flag(settings)
    if not path.exists():
        return
    original = path.read_bytes()
    pid = int(json.loads(original)["pid"])
    kernel = ctypes.windll.kernel32
    kernel.OpenProcess.restype = ctypes.c_void_p
    handle = kernel.OpenProcess(0x1000, False, pid)
    if handle:
        exit_code = ctypes.c_ulong()
        getter = kernel.GetExitCodeProcess
        getter.argtypes = [ctypes.c_void_p, ctypes.POINTER(ctypes.c_ulong)]
        known = getter(ctypes.c_void_p(handle), ctypes.byref(exit_code))
        closer = kernel.CloseHandle
        closer.argtypes = [ctypes.c_void_p]
        closer(ctypes.c_void_p(handle))
        if not known or exit_code.value == 259:
            raise RecoveryError("MAINTENANCE_OWNER_STILL_ALIVE")
    elif kernel.GetLastError() != 87:
        raise RecoveryError("MAINTENANCE_OWNER_UNKNOWN")
    engine = create_engine(settings.selected_database_url(), poolclass=NullPool)
    try:
        with engine.connect() as connection:
            if not connection.scalar(text("SELECT pg_try_advisory_lock(:key)"), {"key": LOCK}):
                raise RecoveryError("MAINTENANCE_STILL_OWNED")
            try:
                if path.read_bytes() != original:
                    raise RecoveryError("MAINTENANCE_OWNER_CHANGED")
                path.unlink()
            finally:
                connection.execute(text("SELECT pg_advisory_unlock(:key)"), {"key": LOCK})
    finally:
        engine.dispose()
