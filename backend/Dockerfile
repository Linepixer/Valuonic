FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .

# The host reverse proxy reaches the container through the Docker bridge gateway (172.16.0.0/12 by default).
# Trusting only that range makes uvicorn take the real client IP from X-Forwarded-For for rate limiting;
# "*" would trust the left-most, client-forgeable entry instead. Override if your Docker pools differ.
ENV FORWARDED_ALLOW_IPS="127.0.0.1,172.16.0.0/12"

EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
