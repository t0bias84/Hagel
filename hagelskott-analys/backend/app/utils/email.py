from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr
import logging
from pathlib import Path
import os
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    """
    Serviceclass för att hantera e-postutskick i applikationen.
    Om SMTP-konfigurationer saknas, simulerar tjänsten e-postutskick.
    """
    
    @staticmethod
    def _get_template_path(template_name):
        """Hämta sökvägen till e-postmallen"""
        base_dir = Path(__file__).parent.parent
        template_dir = base_dir / "templates" / "email"
        return template_dir / f"{template_name}.html"
    
    @staticmethod
    def _read_template(template_name):
        """Läs innehållet i e-postmallen"""
        try:
            template_path = EmailService._get_template_path(template_name)
            if not template_path.exists():
                logger.warning(f"E-postmall saknas: {template_name}")
                return "<!-- Template saknas -->"
            
            with open(template_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            logger.error(f"Fel vid läsning av e-postmall: {str(e)}")
            return "<!-- Fel vid läsning av mall -->"
    
    @staticmethod
    def _format_template(template_content, **kwargs):
        """Formatera e-postmallen med givna variabler"""
        for key, value in kwargs.items():
            placeholder = f"{{{{{key}}}}}"
            template_content = template_content.replace(placeholder, str(value))
        return template_content
    
    @staticmethod
    async def send_email(recipient_email: EmailStr, subject: str, template_name: str, **template_params):
        """
        Skicka ett e-postmeddelande med angivet ämne och innehåll.
        Om SMTP-konfigurationer saknas, simuleras e-postutskicket (loggas).
        
        Args:
            recipient_email: Mottagarens e-postadress
            subject: E-postens ämne
            template_name: Namnet på e-postmallen att använda
            **template_params: Parametrar att ersätta i mallen
        
        Returns:
            bool: True om e-posten skickades framgångsrikt, annars False
        """
        try:
            # Hämta och formatera mall
            template_content = EmailService._read_template(template_name)
            formatted_content = EmailService._format_template(template_content, **template_params)
            
            # Kontrollera om SMTP är konfigurerad
            if not all([settings.SMTP_HOST, settings.SMTP_PORT, settings.SMTP_USER, settings.SMTP_PASSWORD]):
                # Simulera e-postutskick i utvecklingsmiljö
                logger.info(f"Simulerar e-postutskick:")
                logger.info(f"Till: {recipient_email}")
                logger.info(f"Ämne: {subject}")
                logger.info(f"Innehåll: {formatted_content[:150]}...")
                return True
            
            # Konfigurera FastMail
            conf = ConnectionConfig(
                MAIL_USERNAME=settings.SMTP_USER,
                MAIL_PASSWORD=settings.SMTP_PASSWORD,
                MAIL_FROM=settings.EMAIL_FROM,
                MAIL_PORT=settings.SMTP_PORT,
                MAIL_SERVER=settings.SMTP_HOST,
                MAIL_STARTTLS=True,
                MAIL_SSL_TLS=False,
                USE_CREDENTIALS=True
            )
            
            # Skapa meddelandet
            message = MessageSchema(
                subject=subject,
                recipients=[recipient_email],
                body=formatted_content,
                subtype="html"
            )
            
            # Skicka via FastMail
            fm = FastMail(conf)
            await fm.send_message(message)
            
            logger.info(f"E-post skickad till {recipient_email}")
            return True
            
        except Exception as e:
            logger.error(f"Fel vid skickning av e-post: {str(e)}")
            return False
            
    @staticmethod
    async def send_password_reset_email(recipient_email: EmailStr, username: str, reset_url: str):
        """
        Skicka ett e-postmeddelande för lösenordsåterställning.
        
        Args:
            recipient_email: Mottagarens e-postadress
            username: Användarnamn
            reset_url: URL för lösenordsåterställning
            
        Returns:
            bool: True om e-posten skickades framgångsrikt, annars False
        """
        subject = "Återställ ditt lösenord - Hagelskott Analys"
        return await EmailService.send_email(
            recipient_email=recipient_email,
            subject=subject,
            template_name="password_reset",
            username=username,
            reset_url=reset_url,
            app_name=settings.PROJECT_NAME
        )
    
    @staticmethod
    async def send_email_verification(recipient_email: EmailStr, username: str, verification_url: str):
        """
        Skicka ett e-postmeddelande för e-postverifiering.
        
        Args:
            recipient_email: Mottagarens e-postadress
            username: Användarnamn
            verification_url: URL för e-postverifiering
            
        Returns:
            bool: True om e-posten skickades framgångsrikt, annars False
        """
        subject = "Verifiera din e-postadress - Hagelskott Analys"
        return await EmailService.send_email(
            recipient_email=recipient_email,
            subject=subject,
            template_name="email_verification",
            username=username,
            verification_url=verification_url,
            app_name=settings.PROJECT_NAME,
            current_year=datetime.now().year
        )
    
    @staticmethod
    async def send_admin_password_reset_notification(admin_email: EmailStr, reset_username: str, reset_by_admin: str):
        """
        Skicka en notifikation till admin när ett lösenord återställs.
        
        Args:
            admin_email: Admins e-postadress
            reset_username: Användarnamnet vars lösenord återställs
            reset_by_admin: Användarnamnet på admin som utförde återställningen
            
        Returns:
            bool: True om e-posten skickades framgångsrikt, annars False
        """
        subject = "Admin-notifikation: Lösenordsåterställning"
        return await EmailService.send_email(
            recipient_email=admin_email,
            subject=subject,
            template_name="admin_password_reset",
            reset_username=reset_username,
            reset_by_admin=reset_by_admin,
            timestamp=EmailService._get_formatted_timestamp(),
            app_name=settings.PROJECT_NAME
        )
    
    @staticmethod
    async def send_password_changed_notification(recipient_email: EmailStr, username: str):
        """
        Skicka ett meddelande för att meddela användaren att deras lösenord har ändrats.
        
        Args:
            recipient_email: Mottagarens e-postadress
            username: Användarnamn
            
        Returns:
            bool: True om e-posten skickades framgångsrikt, annars False
        """
        subject = "Ditt lösenord har ändrats - Hagelskott Analys"
        return await EmailService.send_email(
            recipient_email=recipient_email,
            subject=subject,
            template_name="password_changed",
            username=username,
            timestamp=EmailService._get_formatted_timestamp(),
            current_year=datetime.now().year,
            app_name=settings.PROJECT_NAME
        )
    
    @staticmethod
    def _get_formatted_timestamp():
        """Returnera en formaterad tidsstämpel för e-postmeddelanden"""
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")