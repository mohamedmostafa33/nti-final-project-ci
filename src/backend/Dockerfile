FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install dependencies
COPY ./requirements.txt /app/requirements.txt

RUN pip install --upgrade pip

RUN pip install -r /app/requirements.txt

# Copy project
COPY . /app/

# Run the application
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]