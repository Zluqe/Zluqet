from flask import Flask, render_template, request, redirect, url_for, abort
from flask_sqlalchemy import SQLAlchemy
from pygments.lexers import get_lexer_for_mimetype, guess_lexer
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
        language = lexer.aliases[0] if lexer.aliases else 'plaintext'
    except ClassNotFound:
        language = 'plaintext'
    
    return render_template('view_paste.html', paste=paste, language=language)

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

@app.errorhandler(404)
def page_not_found(e):
    return render_template('errors/404.html'), 404

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)