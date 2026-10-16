"""Loopback-only BFF: serve KAY's real form and sign bounded JSON server-side."""

import json
import ssl
import time
from collections.abc import Awaitable, Callable
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, HTTPSHandler, ProxyHandler, build_opener
from urllib.request import Request as UpstreamRequest

from fastapi import FastAPI, Request, Response
from starlette.concurrency import run_in_threadpool

from app.intake.authentication import signature
from app.intake.configuration import load_key
from app.runtime import BACKEND_ROOT
from app.settings import Settings


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(
        self, req: UpstreamRequest, fp: object, code: int, msg: str, headers: object, newurl: str
    ) -> None:
        return None


def create_simulator(
    settings: Settings, port: int = 8001, api_port: int = 8000, frontend_port: int = 3000
) -> FastAPI:
    for value in (port, api_port, frontend_port):
        if not 1024 <= value <= 65535:
            raise ValueError("INVALID_LOCAL_PORT")
    origin = f"https://127.0.0.1:{port}"
    context = ssl.create_default_context(
        cafile=str(BACKEND_ROOT / ".local-data/certificates/ca.pem")
    )
    opener = build_opener(ProxyHandler({}), HTTPSHandler(context=context), NoRedirect())
    application = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    def upstream(path: str, body: bytes | None = None, status: bool = False) -> Response:
        headers = {"Accept": "application/json" if body is not None else "*/*"}
        if body is not None:
            key = load_key(settings)
            timestamp = str(int(time.time()))
            headers.update(
                {
                    "Content-Type": "application/json",
                    "X-Kay-Timestamp": timestamp,
                    "X-Kay-Signature": signature(key, timestamp, body),
                }
            )
            url = f"https://localhost:{api_port}/api/v1/intake/website/{key.source_key}" + (
                "/receipt" if status else ""
            )
        else:
            url = f"https://localhost:{frontend_port}" + path
        try:
            with opener.open(UpstreamRequest(url, data=body, headers=headers), timeout=8) as result:  # noqa: S310 - fixed loopback HTTPS origins, redirects/proxies disabled.
                data = result.read(2_000_001)
                if len(data) > 2_000_000:
                    raise RuntimeError("SIMULATOR_RESPONSE_TOO_LARGE")
                if body is not None:
                    decoded = json.loads(data)
                    if set(decoded) != {"receipt_id", "state"} or decoded["state"] not in {
                        "queued",
                        "processed",
                        "failed",
                    }:
                        raise ValueError("INVALID_RECEIPT")
                    data = json.dumps(decoded).encode()
                return Response(
                    data,
                    status_code=result.status,
                    media_type=result.headers.get("Content-Type", "application/octet-stream").split(
                        ";"
                    )[0],
                )
        except HTTPError as error:
            code = error.code if error.code in {401, 404, 409, 413, 422, 429} else 503
            error.close()
            return Response(
                '{"error":"SUBMISSION_UNAVAILABLE"}',
                status_code=code,
                media_type="application/json",
            )
        except URLError, OSError, ValueError, RuntimeError:
            return Response(
                '{"error":"SIMULATOR_UNAVAILABLE"}', status_code=503, media_type="application/json"
            )

    @application.middleware("http")
    async def boundary(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.headers.get("host") != f"127.0.0.1:{port}":
            return Response(status_code=404)
        if request.method == "POST":
            if (
                request.headers.get("origin") != origin
                or request.headers.get("content-type") != "application/json"
            ):
                return Response(status_code=403)
            chunks, size = [], 0
            async for chunk in request.stream():
                size += len(chunk)
                if size > 8192:
                    return Response(status_code=413)
                chunks.append(chunk)
            request._body = b"".join(chunks)
        response = await call_next(request)
        response.headers.update(
            {
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "no-referrer",
                "X-Frame-Options": "DENY",
            }
        )
        return response

    @application.get("/")
    def form() -> Response:
        return upstream("/website-simulator")

    @application.get("/favicon.svg")
    def favicon() -> Response:
        return upstream("/favicon.svg")

    @application.get("/_next/static/{asset:path}")
    def assets(asset: str) -> Response:
        if (
            ".." in asset
            or not asset
            or any(
                c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/.[ ]%~@"
                for c in asset
            )
        ):
            return Response(status_code=404)
        return upstream("/_next/static/" + asset)

    @application.post("/submit")
    async def submit(request: Request) -> Response:
        return await run_in_threadpool(upstream, "", await request.body())

    @application.post("/receipt")
    async def receipt(request: Request) -> Response:
        return await run_in_threadpool(upstream, "", await request.body(), True)

    return application
