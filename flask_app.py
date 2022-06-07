#!interpreter [optional-arg]
# -*- coding: utf-8 -*-

"""
app.py:
"""

#D DEVELOPMENT
#Built-in/Generic Imports

import datetime
from flask import Flask, redirect, render_template, request, url_for, session, flash
from flask_cors import CORS


app = Flask(__name__)
app.config['SECRET_KEY'] = 'StArFox64'
app.config['CORS_HEADERS'] = 'Content-Type'
CORS(app, resources={r"/*": {"origins": "*"}})

#python3.7 -m pip install -U flask-cors

@app.route("/")
def index():
	return render_template('base.html')
