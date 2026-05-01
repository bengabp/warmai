"""SMTP mail-sending helpers — pure functions, no DB access."""

from __future__ import annotations

import smtplib
import socket
import ssl
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Literal

from app.logging import get_logger

logger = get_logger("app.mailer")


@dataclass(frozen=True)
class SmtpConfig:
    hostname: str
    port: int
    email: str
    password: str
    security: Literal["ssl", "tls", "unsecure"] = "tls"


@dataclass
class SendResult:
    ok: bool
    message: str


def _open_smtp(cfg: SmtpConfig, timeout: float = 15.0) -> smtplib.SMTP:
    if cfg.security == "ssl":
        ctx = ssl.create_default_context()
        return smtplib.SMTP_SSL(cfg.hostname, cfg.port, timeout=timeout, context=ctx)
    server = smtplib.SMTP(cfg.hostname, cfg.port, timeout=timeout)
    if cfg.security == "tls":
        server.starttls(context=ssl.create_default_context())
    return server


def send_html(
    cfg: SmtpConfig, *, to_email: str, subject: str, body_html: str, batch_id: str = ""
) -> SendResult:
    """Send a single HTML email. Returns (ok, message)."""
    try:
        server = _open_smtp(cfg)
    except (smtplib.SMTPException, socket.timeout, OSError) as exc:
        return SendResult(False, f"connect failed: {exc}")

    try:
        server.login(cfg.email, cfg.password)
        msg = MIMEMultipart()
        msg["Subject"] = subject
        msg["From"] = cfg.email
        msg["To"] = to_email
        wrapped = (
            f'<html><body><div data-warmup-batch="{batch_id}">{body_html}</div></body></html>'
        )
        msg.attach(MIMEText(wrapped, "html"))
        server.sendmail(cfg.email, to_email, msg.as_string())
        return SendResult(True, "sent")
    except smtplib.SMTPException as exc:
        return SendResult(False, f"smtp error: {exc}")
    except socket.timeout:
        return SendResult(False, "timeout")
    finally:
        try:
            server.quit()
        except Exception:
            pass


def verify_smtp(cfg: SmtpConfig, recipient: str) -> SendResult:
    """Verify SMTP credentials by sending a probe email."""
    return send_html(
        cfg,
        to_email=recipient,
        subject="WarmAI mail server verification",
        body_html=(
            "<p>This is a verification message from WarmAI. "
            "If you received this, your SMTP credentials work.</p>"
        ),
        batch_id="verify",
    )
