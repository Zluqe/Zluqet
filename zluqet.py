from flask import Flask, render_template, request, redirect, url_for, abort, make_response
from flask_sqlalchemy import SQLAlchemy
import pymysql
import string
import random
from datetime import datetime
import os

# Initialize Flask app
app = Flask(__name__)

# Database Configuration (Reads from Environment Variables)
MYSQL_USER = os.getenv("MYSQL_USER", "zluqet_user")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "securepassword")  # No more root
MYSQL_HOST = os.getenv("MYSQL_HOST", "db")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "zluqetdb")

DATABASE_URL = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}/{MYSQL_DATABASE}"
app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'zluqet'

# Initialize Database
db = SQLAlchemy(app)

# Define Paste Model
class Paste(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    key = db.Column(db.String(8), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<Paste {self.key}>'

# Function to Generate Unique Keys
def generate_key(length=8):
    chars = string.ascii_uppercase + string.digits
    while True:
        key = ''.join(random.choice(chars) for _ in range(length))
        if not Paste.query.filter_by(key=key).first():
            return key

# Home Route (Create New Paste)
@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        content = request.form.get('content')
        if not content:
            return redirect(url_for('index'))
        
        key = generate_key()
        new_paste = Paste(content=content, key=key)
        
        db.session.add(new_paste)
        db.session.commit()
        
        return redirect(url_for('view_paste', key=key))
    
    return render_template('index.html')

# View a Paste
@app.route('/<key>')
def view_paste(key):
    paste = Paste.query.filter_by(key=key).first()
    if not paste:
        abort(404)

    response = make_response(render_template('view_paste.html', paste=paste))
    response.headers['X-Robots-Tag'] = 'noindex, nofollow'  # Prevents search engine indexing
    return response

# View Raw Paste (Plaintext)
@app.route('/raw/<key>')
def raw_paste(key):
    paste = Paste.query.filter_by(key=key).first()
    if not paste:
        abort(404)
    return paste.content, {'Content-Type': 'text/plain'}

# Duplicate & Edit Paste
@app.route('/edit/<key>', methods=['GET', 'POST'])
def dupe_paste(key):
    paste = Paste.query.filter_by(key=key).first()
    if not paste:
        abort(404)

    if request.method == 'POST':
        content = request.form.get('content')
        if not content:
            return redirect(url_for('index'))

        new_key = generate_key()
        new_paste = Paste(content=content, key=new_key)
        
        db.session.add(new_paste)
        db.session.commit()
        
        return redirect(url_for('view_paste', key=new_key))

    return render_template('edit_paste.html', paste=paste)

# 404 Error Handler
@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404

# Create Tables & Run App
if __name__ == '__main__':
    with app.app_context():
        db.create_all()  # Automatically creates tables if they don't exist
    app.run(host="0.0.0.0", port=8000, debug=False, threaded=True)