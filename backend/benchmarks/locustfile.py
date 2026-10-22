"""100 distinct current staff sessions, real TLS/CSRF and failure-inclusive p95."""

import json
import math
import os
import ssl
import time
from collections import defaultdict
from uuid import uuid4

import gevent
from gevent.queue import Queue
from locust import HttpUser, between, events, task
from locust.exception import StopUser
from sqlalchemy import text

from app.db.isolation import assert_isolated
from app.db.session import Database
from app.identity.security import csrf_token
from app.recovery.private import crypt, guard
from app.runtime import BACKEND_ROOT, require_venv
from app.settings import load_settings
from benchmarks.dataset import CONTEXT, ROOT, expected_enquiries

ACTORS = Queue()
SAMPLES = defaultdict(list)
FAILURES = defaultdict(int)
SETUP_LOGINS = defaultdict(int)
SETUP_PHASES = defaultdict(int)
USER_ERRORS = defaultdict(int)
READY = set()
SOCKETS = set()
TELEMETRY = defaultdict(float)
LIVE = os.environ.get("KAY_BENCHMARK_REALTIME") == "1"
STATE = {
    "measuring": False,
    "began": None,
    "seconds": 0.0,
    "minimum_users": 100,
    "started": 0,
    "completed": 0,
    "minimum_sockets": 100,
    "invalidations": 0,
}


@events.user_error.add_listener
def user_error(user_instance, exception, tb, **kwargs):
    USER_ERRORS[type(exception).__name__] += 1


@events.init.add_listener
def initialize(environment, **kwargs):
    require_venv()
    settings = load_settings()
    if settings.app_environment != "benchmark" or environment.host not in {
        None,
        "https://localhost:8200",
    }:
        raise RuntimeError("BENCHMARK_TARGET_REFUSED")
    assert_isolated(settings)
    path = ROOT / "credentials.dpapi"
    guard(path, ROOT)
    actors = json.loads(crypt(path.read_bytes(), CONTEXT, encrypt=False))
    if len(actors) != 100:
        raise RuntimeError("EXACTLY_100_BENCHMARK_ACCOUNTS_REQUIRED")
    database = Database(settings.selected_database_url())
    try:
        with database.engine.connect() as connection:
            connection.execute(text("SET TRANSACTION READ ONLY"))
            status_counts = dict(
                connection.execute(
                    text("SELECT status,count(*) FROM enquiry GROUP BY status")
                ).all()
            )
    finally:
        database.close()
    for position, actor in enumerate(actors):
        actor["expected_contacts"] = (
            200000 if actor["role"] != "agent" else 2223 if position < 30 else 2222
        )
        actor["expected_enquiries"] = expected_enquiries(position, status_counts)
        ACTORS.put(actor)


@events.test_start.add_listener
def start_measurement(environment, **kwargs):
    def monitor():
        deadline = time.monotonic() + 90
        while len(READY) != 100:
            if time.monotonic() > deadline:
                environment.process_exit_code = 1
                environment.runner.quit()
                return
            gevent.sleep(0.1)
        gevent.sleep(15)
        environment.stats.reset_all()
        STATE.update(measuring=True, began=time.monotonic())
        print("SP22_STEADY_BEGIN users=100 warmup_seconds=15", flush=True)
        for _ in range(60):
            STATE["minimum_users"] = min(STATE["minimum_users"], environment.runner.user_count)
            if LIVE:
                STATE["minimum_sockets"] = min(STATE["minimum_sockets"], len(SOCKETS))
            gevent.sleep(1)
        STATE["seconds"] = time.monotonic() - STATE["began"]
        STATE["measuring"] = False
        environment.runner.quit()

    gevent.spawn(monitor)


@events.request.add_listener
def record(name, response_time, exception, context=None, **kwargs):
    if context and context.get("steady"):
        SAMPLES[name].append(response_time)
        FAILURES[name] += int(exception is not None)


@events.quitting.add_listener
def finish(environment, **kwargs):
    routes = []
    passed = (
        len(READY) == 100
        and STATE["seconds"] >= 60
        and STATE["minimum_users"] == 100
        and not USER_ERRORS
        and (not LIVE or STATE["minimum_sockets"] == 100)
    )
    passed = passed and STATE["started"] == STATE["completed"] == sum(map(len, SAMPLES.values()))
    for name, samples in sorted(SAMPLES.items()):
        ordered = sorted(samples)
        p95 = ordered[math.ceil(len(ordered) * 0.95) - 1]
        limit = 2000 if name == "dashboard" else 1000
        ok = len(ordered) >= 50 and not FAILURES[name] and p95 <= limit
        routes.append(
            {
                "route": name,
                "requests": len(ordered),
                "failures": FAILURES[name],
                "p95_ms": round(p95, 3),
                "limit_ms": limit,
                "passed": ok,
            }
        )
        passed = passed and ok
    passed = passed and len(routes) == 6
    result = {
        "api_processes": int(os.environ.get("KAY_BENCHMARK_WORKERS", "1")),
        "accounts": len(READY),
        "realtime_enabled": LIVE,
        "minimum_steady_sockets": STATE["minimum_sockets"] if LIVE else None,
        "live_invalidations": STATE["invalidations"],
        "live_telemetry_maxima": dict(TELEMETRY),
        "unexpected_socket_disconnects": USER_ERRORS.get("WebSocketDisconnected", 0),
        "setup_logins": [
            {"role": role, "status": status, "count": count}
            for (role, status), count in sorted(SETUP_LOGINS.items())
        ],
        "setup_phases": dict(SETUP_PHASES),
        "user_error_types": dict(USER_ERRORS),
        "minimum_steady_users": STATE["minimum_users"],
        "warmup_after_all_logins_seconds": 15,
        "steady_seconds": STATE["seconds"],
        "mix_weights": {
            "contacts": 3,
            "enquiries": 2,
            "properties": 2,
            "contact_detail": 1,
            "dashboard": 1,
            "note_write": 1,
        },
        "think_seconds": [0.5, 1.0],
        "started_requests": STATE["started"],
        "completed_requests": STATE["completed"],
        "routes": routes,
        "passed": passed,
    }
    path = ROOT / "latest-result.json"
    guard(path, ROOT)
    path.write_text(json.dumps(result, indent=2), encoding="utf8")
    print("SP22_LOAD_RESULT " + json.dumps(result), flush=True)
    environment.process_exit_code = 0 if passed else 1


class KAYBenchmarkUser(HttpUser):
    host = "https://localhost:8200"
    wait_time = between(0.5, 1.0)

    def measured(self, method, path, **kwargs):
        steady = STATE["measuring"]
        if steady:
            STATE["started"] += 1
        try:
            with self.client.request(
                method, path, context={"steady": steady}, catch_response=True, **kwargs
            ) as response:
                if response.status_code == 200:
                    try:
                        body = response.json()
                        name = kwargs["name"]
                        valid = True
                        if name in {"contacts", "enquiries", "properties"}:
                            expected = (
                                20000
                                if name == "properties"
                                else self.actor["expected_enquiries"]
                                if name == "enquiries"
                                else self.actor["expected_contacts"]
                            )
                            valid = body["total"] == expected and len(body["items"]) == 25
                        elif name == "contact_detail":
                            valid = body["id"] == self.actor["contact_id"]
                        elif name == "dashboard":
                            metric = next(
                                item for item in body["metrics"] if item["key"] == "contacts"
                            )
                            valid = metric["total"] == self.actor["expected_contacts"]
                        elif name == "note_write":
                            valid = (
                                body["contact_id"] == self.actor["contact_id"]
                                and body["operation"] == "notes"
                            )
                        if not valid:
                            response.failure("BENCHMARK_RESPONSE_CONTRACT_FAILED")
                    except ValueError, KeyError, TypeError, StopIteration:
                        response.failure("BENCHMARK_RESPONSE_CONTRACT_FAILED")
                return response
        finally:
            if steady:
                STATE["completed"] += 1

    def on_start(self):
        try:
            if not self.establish_session():
                raise StopUser
        except StopUser:
            raise
        except Exception as failure:
            USER_ERRORS[type(failure).__name__] += 1
            raise StopUser from None
        # Establish all sessions before the documented fifteen-second workload warm-up.
        while len(READY) != 100:
            gevent.sleep(0.1)

    def establish_session(self) -> bool:
        self.actor = ACTORS.get_nowait()
        SETUP_PHASES["assigned"] += 1
        settings = load_settings()
        self.client.verify = str(BACKEND_ROOT / ".local-data/certificates/ca.pem")
        self.client.trust_env = False
        self.client.headers.update(
            {
                "Origin": settings.frontend_origin,
                "X-Kay-Facade-Secret": settings.facade_secret.get_secret_value(),
            }
        )
        SETUP_PHASES["request_started"] += 1
        with self.client.post(
            "/api/v1/auth/login",
            json={"email": self.actor["email"], "password": self.actor["password"]},
            name="SETUP login",
            catch_response=True,
        ) as response:
            SETUP_PHASES["response_received"] += 1
            SETUP_LOGINS[self.actor["role"], response.status_code] += 1
            if response.status_code != 200:
                response.failure("BENCHMARK_LOGIN_FAILED")
                return False
            token = response.json()["session_token"]
        self.client.headers.update(
            {
                "X-Kay-Session": token,
                "X-CSRF-Token": csrf_token(settings.facade_secret.get_secret_value(), token),
            }
        )
        if LIVE:
            import websocket

            response = self.client.post("/api/v1/realtime/tickets", json={}, name="SETUP ticket")
            if response.status_code != 200 or not response.json().get("enabled"):
                raise RuntimeError("BENCHMARK_TICKET_FAILED")
            self.live_socket = websocket.create_connection(
                "wss://localhost:8200/api/v1/realtime/ws",
                origin=settings.frontend_origin,
                sslopt={"ca_certs": self.client.verify, "cert_reqs": ssl.CERT_REQUIRED},
                timeout=30,
            )
            self.live_socket.send(json.dumps({"ticket": response.json()["ticket"]}))
            if json.loads(self.live_socket.recv()) != {"type": "ready"}:
                raise RuntimeError("BENCHMARK_SOCKET_AUTH_FAILED")
            SOCKETS.add(self.actor["id"])
            self.live_stopping = False
            self.live_reader = gevent.spawn(self.read_live)
        READY.add(self.actor["id"])
        SETUP_PHASES["ready"] += 1
        return True

    def read_live(self):
        try:
            while not self.live_stopping:
                message = json.loads(self.live_socket.recv())
                if message["type"] == "ping":
                    self.live_socket.send(json.dumps({"type": "pong", "visible": True}))
                elif message["type"] == "invalidate":
                    STATE["invalidations"] += 1
                    if (
                        self.actor["role"] == "administrator"
                        and time.monotonic() - getattr(self, "telemetry_at", 0) > 5
                    ):
                        self.telemetry_at = time.monotonic()
                        response = self.client.get("/api/v1/realtime/status", name="TELEMETRY live")
                        if response.status_code == 200:
                            for key, value in response.json().items():
                                if isinstance(value, (int, float)):
                                    TELEMETRY[key] = max(TELEMETRY[key], value)
        except Exception:
            if not self.live_stopping:
                USER_ERRORS["WebSocketDisconnected"] += 1
        finally:
            SOCKETS.discard(self.actor["id"])

    def on_stop(self):
        if LIVE and hasattr(self, "live_socket"):
            self.live_stopping = True
            if hasattr(self, "live_reader"):
                self.live_reader.kill(block=False)
            self.live_socket.close()

    @task(3)
    def contacts(self):
        self.measured("GET", "/api/v1/contacts?page=1&page_size=25", name="contacts")

    @task(2)
    def enquiries(self):
        self.measured("GET", "/api/v1/enquiries?page=2&page_size=25", name="enquiries")

    @task(2)
    def properties(self):
        self.measured("GET", "/api/v1/properties?page=1&page_size=25", name="properties")

    @task
    def contact_detail(self):
        self.measured("GET", "/api/v1/contacts/" + self.actor["contact_id"], name="contact_detail")

    @task
    def dashboard(self):
        self.measured("GET", "/api/v1/reports/dashboard", name="dashboard")

    @task
    def note(self):
        self.measured(
            "POST",
            "/api/v1/contacts/" + self.actor["contact_id"] + "/notes",
            json={"kind": "note", "body": "Suivi synthétique SP22"},
            headers={"Idempotency-Key": str(uuid4())},
            name="note_write",
        )
