from flask import Flask, render_template, request, redirect, url_for, abort, make_response, jsonify
from flask_sqlalchemy import SQLAlchemy
from pygments import highlight
from pygments.lexers import guess_lexer, get_lexer_by_name
from pygments.formatters.html import HtmlFormatter
from pygments.util import ClassNotFound
import string
import random
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///pastes.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.secret_key = 'zluqet'

db = SQLAlchemy(app)

class Paste(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    key = db.Column(db.String(8), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self):
        return f'<Paste {self.key}>'

def generate_key(length=8):
    chars = string.ascii_uppercase + string.digits
    while True:
        key = ''.join(random.choice(chars) for _ in range(length))
        if not Paste.query.filter_by(key=key).first():
            return key

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

@app.route('/<key>')
def view_paste(key):
    paste = Paste.query.filter_by(key=key).first()
    if not paste:
        abort(404)
    
    try:
        lexer = guess_lexer(paste.content)
    except ClassNotFound:
        lexer = get_lexer_by_name("text", stripall=True)
    
    formatter = HtmlFormatter(style="default")
    highlighted_code = highlight(paste.content, lexer, formatter)
    style_defs = formatter.get_style_defs('.highlight')

    response = make_response(
        render_template(
            'view_paste.html',
            paste=paste,
            highlighted_code=highlighted_code,
            style_defs=style_defs
        )
    )
    response.headers['X-Robots-Tag'] = 'noindex, nofollow'
    return response

@app.route('/raw/<key>')
def raw_paste(key):
    paste = Paste.query.filter_by(key=key).first()
    if not paste:
        abort(404)
    return paste.content, {'Content-Type': 'text/plain'}

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

@app.route('/api/documents', methods=['POST'])
def api_create_paste():
    text_content = request.get_data(as_text=True)
    if not text_content:
        return jsonify({'error': 'No content provided.'}), 400

    max_length = 100000
    truncated = False
    if len(text_content) > max_length:
        text_content = text_content[:max_length - 1]
        truncated = True

    key = generate_key()
    new_paste = Paste(content=text_content, key=key)
    
    db.session.add(new_paste)
    db.session.commit()
    
    response_data = {'key': key}
    if truncated:
        response_data['truncated'] = True
    return jsonify(response_data), 200

@app.route('/api/documents/<key>', methods=['GET'])
def api_get_paste(key):
    """
    Retrieve a paste by key in JSON format.
    Returns the paste's key, content, and creation timestamp.
    """
    paste = Paste.query.filter_by(key=key).first()
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

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=False, threaded=True)