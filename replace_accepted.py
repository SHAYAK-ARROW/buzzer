import codecs
c = codecs.open('app/routes/user.py', 'r', 'utf-8').read()
c = c.replace('order.status = "accepted"', 'order.status = "confirmed"')
with codecs.open('app/routes/user.py', 'w', 'utf-8') as f:
    f.write(c)
print("replaced!")
