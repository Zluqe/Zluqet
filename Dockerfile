FROM python:3.12

# Set working directory
WORKDIR /app

# Copy project files
COPY . /app

# Create virtual environment
RUN python -m venv venv

# Activate virtual environment
RUN /app/venv/bin/pip install --upgrade pip && \
    /app/venv/bin/pip install -r requirements.txt

# Set the default shell
ENV PATH="/app/venv/bin:$PATH"

# Expose port
EXPOSE 5000

# Run the application
CMD ["gunicorn", "-w", "8", "-b", "0.0.0.0:5000", "zluqet:app"]