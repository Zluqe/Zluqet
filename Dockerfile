# Python image
FROM python:3.12

# Set the working directory
WORKDIR /app

# Copy files into the container
COPY . /app

# dependencies
RUN pip install --no-cache-dir -r requirements.txt

# MySQL
RUN apt-get update && apt-get install -y default-mysql-client

# Port 8000
EXPOSE 5000

# Run server
CMD ["gunicorn", "-w", "8", "-b", "0.0.0.0:5000", "zluqet:app"]