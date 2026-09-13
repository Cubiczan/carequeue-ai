FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN groupadd --gid 10001 appuser \
    && useradd --uid 10001 --gid 10001 --home-dir /app --shell /usr/sbin/nologin appuser \
    && mkdir -p /app/audit \
    && chown -R 10001:10001 /app
USER 10001

EXPOSE 5002

CMD ["python", "server.py"]
