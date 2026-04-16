FROM node:22-slim AS frontend-build
WORKDIR /build
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .
COPY --from=frontend-build /build/dist ./frontend/dist

RUN mkdir -p certs && \
    openssl req -x509 -newkey rsa:2048 \
    -keyout certs/key.pem -out certs/cert.pem \
    -days 3650 -nodes \
    -subj "/CN=awtoyoly-vault/O=Awtoyoly/C=TM"

EXPOSE 5111
CMD ["python", "app.py"]
