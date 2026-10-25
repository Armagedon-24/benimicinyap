"""Yerel SMTP sink — test e-postalarını yakalayıp dosyaya yazar.
Kullanım: /usr/bin/python3.13 scripts/smtp-sink.py  (port 1025)
"""
import time
from aiosmtpd.controller import Controller

LOG = "/home/z/my-project/scripts/smtp-captured.log"


class Handler:
    async def handle_DATA(self, server, session, envelope):
        content = envelope.content.decode("utf-8", errors="replace")
        with open(LOG, "a", encoding="utf-8") as f:
            f.write("===NEW_MAIL===\n")
            f.write("MAIL_FROM: " + str(envelope.mail_from) + "\n")
            f.write("RCPT_TO: " + ", ".join(envelope.rcpt_tos) + "\n")
            f.write(content + "\n\n")
        print(f"[sink] yakalandi: {envelope.rcpt_tos}", flush=True)
        return "250 OK"


if __name__ == "__main__":
    controller = Controller(Handler(), hostname="127.0.0.1", port=1025)
    controller.start()
    print("[sink] SMTP sink hazir :1025", flush=True)
    while True:
        time.sleep(3600)
