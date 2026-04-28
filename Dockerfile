FROM python:3.9-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ .

# Expose port
EXPOSE 8888

# Start with gunicorn (production server)
CMD ["gunicorn", "--bind", "0.0.0.0:8888", "--workers", "1", "--timeout", "120", "app:app"]
