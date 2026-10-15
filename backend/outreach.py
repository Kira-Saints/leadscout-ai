def template_email(company: str, target: str | None, sender: str = "") -> tuple[str, str]:
    """Non-AI draft. Makes no claims about the company beyond its name."""
    service = target.strip() if target and target.strip() else "digital services"
    subject = f"Quick idea for {company}: {service}"
    body = (
        f"Hi {company} team,\n\n"
        f"I recently came across your website and wanted to reach out.\n\n"
        f"I work on {service} and think there may be a way to support what you're building. "
        f"I'd be glad to share a few specific ideas after learning more about your goals.\n\n"
        f"Would you be open to a short call or email exchange this week?\n\n"
        f"Best regards,\n{sender.strip() or '[Your name]'}"
    )
    return subject, body
