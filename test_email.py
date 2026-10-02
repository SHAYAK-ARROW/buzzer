import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv
import os

load_dotenv('.env')

username = os.getenv('MAIL_USERNAME')
password = os.getenv('MAIL_PASSWORD')

try:
    server = smtplib.SMTP('smtp.gmail.com', 587)
    server.starttls()
    server.login(username, password)
    
    msg = MIMEText('Hello! This is a test email to verify that your SMTP App Password is working correctly for Buzzer Notifications.')
    msg['Subject'] = 'Buzzer - SMTP Connection Test Successful'
    msg['From'] = f"Buzzer App <{username}>"
    msg['To'] = username  # Send to self for testing
    
    server.sendmail(username, username, msg.as_string())
    server.quit()
    print("SUCCESS: Test email sent to", username)
except Exception as e:
    print("FAILED:", e)
