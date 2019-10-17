#! /usr/bin/env python
import cgi
form = cgi.FieldStorage() # instantiate only once!
index = form.getfirst('i', 'empty')

# Avoid script injection escaping the user input
index = cgi.escape(index)

with open('blockchain.txt', 'r') as blockchaintxt:
    print('\n'.join(blockchaintxt.read().split('\n')[index:]))
