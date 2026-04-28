FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code to /app
COPY backend/ .

# Copy frontend to /frontend (app.py expects ../frontend)
COPY frontend/ /frontend/

# Start with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:${PORT:-8888}", "--workers", "1", "--timeout", "120", "app:app"]
