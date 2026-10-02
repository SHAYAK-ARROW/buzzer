import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import threading
import logging

logger = logging.getLogger(__name__)

def send_email_async(to_email, subject, body, html_body=None):
    sender_email = os.getenv("MAIL_USERNAME")
    sender_password = os.getenv("MAIL_PASSWORD")

    # Fallback to mock if credentials are not set
    if not sender_email or not sender_password:
        logger.warning("MAIL_USERNAME or MAIL_PASSWORD not set. Using MOCK EMAIL.")
        print(f"\n[MOCK EMAIL (No Env Config)]\nTo: {to_email}\nSubject: {subject}\nBody: {body}\n")
        return

    def send_task():
        try:
            msg = MIMEMultipart("alternative")
            msg['Subject'] = subject
            msg['From'] = f"Buzzer App <{sender_email}>"
            msg['To'] = to_email

            part1 = MIMEText(body, 'plain')
            msg.attach(part1)
            
            if html_body:
                part2 = MIMEText(html_body, 'html')
                msg.attach(part2)

            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, to_email, msg.as_string())
            server.quit()
            logger.info(f"Email sent successfully to {to_email}")
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            print(f"SMTP Error: {e}")

    # Run in background thread to prevent API from freezing
    thread = threading.Thread(target=send_task)
    thread.start()

