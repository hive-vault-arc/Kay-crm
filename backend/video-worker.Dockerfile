FROM python:3.14.3-slim-trixie

ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
WORKDIR /workspace/backend
RUN apt-get update \
    && apt-get install --yes --no-install-recommends ca-certificates ffmpeg \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.lock ./
RUN python -m venv .venv \
    && ./.venv/bin/python -m pip install --no-cache-dir --require-hashes -r requirements.lock \
    && groupadd --system kay && useradd --system --gid kay --home-dir /workspace/backend kay
COPY --chown=kay:kay app ./app
COPY --chown=kay:kay config ./config
RUN install -d -o kay -g kay -m 0700 .local-data
USER kay
CMD ["/workspace/backend/.venv/bin/python", "-m", "app.cli.video_worker"]
