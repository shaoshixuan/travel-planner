FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ .

# Start with gunicorn, using PORT env var (default 8888)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8888} --workers 1 --timeout 120 app:app"]
