FROM python:3.12-slim

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Generate SSL cert if not exists
RUN mkdir -p certs && \
    openssl req -x509 -newkey rsa:2048 \
    -keyout certs/key.pem -out certs/cert.pem \
    -days 3650 -nodes \
    -subj "/CN=awtoyoly-vault/O=Awtoyoly/C=TM"

ENV VAULT_MASTER_KEY=change-me-in-production
ENV JWT_SECRET=change-me-in-production

EXPOSE 5111
CMD ["python", "app.py"]
