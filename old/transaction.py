#! /usr/bin/env python
import cgi
form = cgi.FieldStorage() # instantiate only once!
transaction = form.getfirst('transaction', 'empty')

with open('unminedtransactions.txt', 'a') as unminedtxt:
    unminedtxt.write(transaction)
