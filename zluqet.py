from flask import Flask, render_template, request, redirect, url_for, abort, make_response, jsonify
from flask_sqlalchemy import SQLAlchemy
from pygments import highlight
from pygments.lexers import guess_lexer, get_lexer_by_name
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound
import string
import random
from datetime import datetime
import time
from collections import defaultdict, deque
from sqlalchemy.engine import Engine
from sqlalchemy import event
from types import SimpleNamespace 
from cachetools import LRUCache
from werkzeug.exceptions import RequestEntityTooLarge

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pastes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_EXPIRE_ON_COMMIT'] = False
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024  

app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'max_overflow': 20,
    'pool_pre_ping': True,
}
app.secret_key = 'zluqet'

db = SQLAlchemy(app)

@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA synchronous = OFF")
    cursor.execute("PRAGMA journal_mode = WAL")
    cursor.execute("PRAGMA cache_size = 10000")
    cursor.close()

ip_requests = defaultdict(deque)
EXEMPT_IPS = {}
REQUESTS_PER_MINUTE = 5

@app.before_request
def rate_limit():
    if request.path.startswith('/api/'):
        client_ip = request.remote_addr
        if client_ip in EXEMPT_IPS:
            return
        
        now = time.time()
        timestamps = ip_requests[client_ip]
        while timestamps and now - timestamps[0] > 60:
            timestamps.popleft()

        if len(timestamps) >= REQUESTS_PER_MINUTE:
            return jsonify({'error': 'Too many requests, please slow down.'}), 429
        
        timestamps.append(now)

class Paste(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    key = db.Column(db.String(8), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<Paste {self.key}>'

# Use LRU caches to limit memory usage
paste_cache = LRUCache(maxsize=1000) 
highlight_cache = LRUCache(maxsize=1000) 

def cache_paste(p):
    return SimpleNamespace(
        content=p.content,
        key=p.key,
        created_at=p.created_at
    )

def get_paste_by_key(key):
    if key in paste_cache:
        return paste_cache[key]
    paste = Paste.query.filter_by(key=key).first()
    if paste:
        lite = cache_paste(paste)
        paste_cache[key] = lite
        return lite
    return None

formatter = HtmlFormatter(style="default")
STYLE_DEFS = formatter.get_style_defs('.highlight')

def generate_key(length=8):
    chars = string.ascii_uppercase + string.digits
    while True:
        key = ''.join(random.choices(chars, k=length))
        if not Paste.query.filter_by(key=key).first():
            return key

def precompute_highlighting(content, key):
    try:
        lexer = guess_lexer(content)
    except ClassNotFound:
        lexer = get_lexer_by_name("text", stripall=True)
    highlighted = highlight(content, lexer, formatter)
    highlight_cache[key] = highlighted

# Maximum allowed characters for a paste
MAX_LENGTH = 100000

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        content = request.form.get('content')
        if not content:
            return redirect(url_for('index'))
        
        if len(content) > MAX_LENGTH:
            error_message = (
                f"Your paste exceeds the maximum allowed character limit "
                f"of {MAX_LENGTH} characters. Please reduce your content before saving."
            )
            # Re-render the page with the error message and user's content preserved.
            return render_template('index.html', error=error_message, content=content)
        
        key = generate_key()
        new_paste = Paste(content=content, key=key)
        db.session.add(new_paste)
        db.session.commit()
        
        lite = cache_paste(new_paste)
        paste_cache[key] = lite
        precompute_highlighting(new_paste.content, key)
        
        return redirect(url_for('view_paste', key=key))
    
    return render_template('index.html')

@app.route('/<key>')
def view_paste(key):
    paste = get_paste_by_key(key)
    if not paste:
        abort(404)
    highlighted_code = highlight_cache.get(key)
    if not highlighted_code:
        try:
            lexer = guess_lexer(paste.content)
        except ClassNotFound:
            lexer = get_lexer_by_name("text", stripall=True)
        highlighted_code = highlight(paste.content, lexer, formatter)
        highlight_cache[key] = highlighted_code

    response = make_response(
        render_template(
            'view_paste.html',
            paste=paste,
            highlighted_code=highlighted_code,
            style_defs=STYLE_DEFS
        )
    )
    response.headers['X-Robots-Tag'] = 'noindex, nofollow'
    return response

@app.route('/raw/<key>')
def raw_paste(key):
    paste = get_paste_by_key(key)
    if not paste:
        abort(404)
    return paste.content, {'Content-Type': 'text/plain'}

@app.route('/edit/<key>', methods=['GET', 'POST'])
def dupe_paste(key):
    paste = get_paste_by_key(key)
    if not paste:
        abort(404)

    if request.method == 'POST':
        content = request.form.get('content')
        if not content:
            return redirect(url_for('index'))

        if len(content) > MAX_LENGTH:
            error_message = (
                f"Your paste exceeds the maximum allowed character limit "
                f"of {MAX_LENGTH} characters. Please reduce your content before saving."
            )
            return render_template('edit_paste.html', error=error_message, paste=paste, content=content)

        new_key = generate_key()
        new_paste = Paste(content=content, key=new_key)
        db.session.add(new_paste)
        db.session.commit()
        
        lite = cache_paste(new_paste)
        paste_cache[new_key] = lite
        precompute_highlighting(new_paste.content, new_key)
        
        return redirect(url_for('view_paste', key=new_key))

    return render_template('edit_paste.html', paste=paste)

@app.route('/api/documents', methods=['POST'])
def api_create_paste():
    text_content = request.get_data(as_text=True)
    if not text_content:
        return jsonify({'error': 'No content provided.'}), 400

    if len(text_content) > MAX_LENGTH:
        return jsonify({'error': f"Your paste exceeds the maximum allowed character limit of {MAX_LENGTH} characters."}), 400

    key = generate_key()
    new_paste = Paste(content=text_content, key=key)
    db.session.add(new_paste)
    db.session.commit()
    
    lite = cache_paste(new_paste)
    paste_cache[key] = lite
    precompute_highlighting(new_paste.content, key)

    response_data = {'key': key}
    return jsonify(response_data), 200

@app.route('/api/documents/<key>', methods=['GET'])
def api_get_paste(key):
    paste = get_paste_by_key(key)
    if not paste:
        return jsonify({'error': 'Paste not found.'}), 404
    return jsonify({
        'key': paste.key,
        'content': paste.content,
        'created_at': paste.created_at.isoformat()
    })

@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404

@app.errorhandler(RequestEntityTooLarge)
def handle_request_entity_too_large(error):
    error_message = (
        f"Your paste is too large! The maximum allowed size is {MAX_LENGTH} characters. "
        "Please reduce your content and try again."
    )
    return render_template("errors/too_large.html", error=error_message), 413

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=False, threaded=True)