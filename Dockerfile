FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV VAULT_MASTER_KEY=change-me-in-production
ENV JWT_SECRET=change-me-in-production

EXPOSE 5100
CMD ["python", "app.py"]
