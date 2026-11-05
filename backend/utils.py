import razorpay
import boto3
import filetype
import io
import uuid
from backend.core.config import settings
from fastapi import UploadFile, HTTPException, status
from botocore.exceptions import BotoCoreError, ClientError
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import utils
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)
from typing import Literal
from datetime import datetime
from mailjet_rest import Client

# razorpay client initialization
razorpay_client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

# aws s3 client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)


# for generating presigned media upload url
def generate_upload_presigned_url(
    s3_key: str, content_type: str, expires_in: int = 1200
) -> str:
    return s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": s3_key,
            "ContentType": content_type,
        },
        ExpiresIn=expires_in,
    )


# for generating presigned media access url
def generate_stream_presigned_url(s3_key: str, expires_in: int = 600) -> str:
    return s3_client.generate_presigned_url(
        ClientMethod="get_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": s3_key,
        },
        ExpiresIn=expires_in,
    )


# for uploading files directly to s3
def upload_to_s3(file: UploadFile, s3_key: str) -> dict:
    try:
        s3_client.upload_fileobj(
            Bucket=settings.AWS_STORAGE_BUCKET_NAME,
            Key=s3_key,
            Fileobj=file.file,
            ExtraArgs={"ContentType": file.content_type},
        )
        return {"detail": "success"}
    except (BotoCoreError, ClientError):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"file upload failed",
        )


# check uploaded files are correct type
def check_valid_file(file: UploadFile, type: str):
    head_bytes = file.file.read(261)
    kind = filetype.guess(head_bytes)
    if kind is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"invalid file type",
        )
    elif not kind.mime.startswith(f"{type}/"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"invalid file type",
        )
    file.file.seek(0)
    return


# helper function for reportlib image
def _get_scaled_image(
    logo_path: str,
    target_width: float,
    h_align: Literal["LEFT", "CENTER", "CENTRE", "RIGHT"] = "LEFT",
) -> Image:
    img_reader = utils.ImageReader(logo_path)
    w, h = img_reader.getSize()
    height = target_width * (h / float(w))
    img = Image(logo_path, width=target_width, height=height)
    img.hAlign = h_align
    return img


# generate invoice pdf
def generate_invoice_pdf(
    transaction_id: uuid.UUID,
    order_id: str,
    payment_id: str,
    order_date: datetime,
    student_id: str,
    course_id: uuid.UUID,
    course_name: str,
    course_type: str,
    amount: int,
    website_logo_path: str,
    razorpay_logo_path: str,
    currency: str = "INR",
):
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    story = []

    invoice_title = ParagraphStyle(
        "InvoiceTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=28,
        textColor=colors.black,
        alignment=1,
    )
    td_label = ParagraphStyle(
        "TDLabel",
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.black,
    )
    td_value = ParagraphStyle(
        "TDValue",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.black,
    )
    total_label = ParagraphStyle(
        "TotalLabel",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.black,
    )
    total_value = ParagraphStyle(
        "TotalValue",
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.black,
    )
    website_name_style = ParagraphStyle(
        "LeftWebsiteName",
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#016630"),
    )

    website_logo = _get_scaled_image(
        website_logo_path, target_width=0.5 * inch, h_align="LEFT"
    )
    website_name = Paragraph("Skillhub", website_name_style)

    left_header_table = Table(
        [[website_logo, website_name]], colWidths=[0.5 * inch, 2.25 * inch]
    )
    left_header_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 0),
                ("LEFTPADDING", (1, 0), (1, 0), 10),
            ]
        )
    )

    razorpay_logo = _get_scaled_image(
        razorpay_logo_path, target_width=1.0 * inch, h_align="RIGHT"
    )

    logo_table = Table(
        [[left_header_table, razorpay_logo]], colWidths=[3.5 * inch, 3.5 * inch]
    )
    logo_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (1, 0), (1, 0), "RIGHT"),
                ("PADDING", (0, 0), (-1, -1), 0),
            ]
        )
    )
    story.append(logo_table)
    story.append(Spacer(1, 70))
    story.append(Paragraph("INVOICE", invoice_title))
    story.append(Spacer(1, 15))

    table_data = [
        [
            Paragraph("Transaction ID", td_label),
            Paragraph(str(transaction_id), td_value),
        ],
        [Paragraph("Order ID", td_label), Paragraph(order_id, td_value)],
        [Paragraph("Payment ID", td_label), Paragraph(payment_id, td_value)],
        [
            Paragraph("Date (UTC)", td_label),
            Paragraph(order_date.strftime("%Y-%m-%d %H:%M"), td_value),
        ],
        [Paragraph("Phone No", td_label), Paragraph(student_id, td_value)],
        [Paragraph("Course ID", td_label), Paragraph(str(course_id), td_value)],
        [Paragraph("Course Name", td_label), Paragraph(course_name, td_value)],
        [Paragraph("Course Type", td_label), Paragraph(course_type, td_value)],
        [
            Paragraph("Total Amount", total_label),
            Paragraph(f"{currency} {amount / 100:.2f}", total_value),
        ],
    ]

    invoice_table = Table(table_data, colWidths=[2.2 * inch, 4.8 * inch])
    invoice_table.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("PADDING", (0, 0), (-1, -1), 8),
                ("INNERGRID", (0, 0), (-1, -2), 0.5, colors.black),
                ("BOX", (0, 0), (-1, -2), 0.5, colors.black),
                ("LINEBELOW", (0, -1), (-1, -1), 1.5, colors.black),
            ]
        )
    )
    story.append(invoice_table)

    def draw_footer(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.gray)
        footer_text = "This is a computer generated invoice. For any wrong info please contact support."
        page_width = letter[0]
        canvas.drawCentredString(page_width / 2.0, 36, footer_text)
        canvas.restoreState()

    doc.build(story, onFirstPage=draw_footer, onLaterPages=draw_footer)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes


# send email otp
def send_otp(receiver_email: str, code: str):
    with Client(
        auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY), version="v3.1"
    ) as mailjet:
        data = {
            "Messages": [
                {
                    "From": {
                        "Email": settings.MAILJET_SENDER_EMAIL,
                        "Name": "Shikkhaniketan",
                    },
                    "To": [{"Email": receiver_email}],
                    "Subject": "OTP verification",
                    "TextPart": f"Welcome! Your verification code is: {code}",
                    "HTMLPart": f"<h3>Welcome!</h3><p>Your verification code is: <strong>{code}</strong></p><p>This code will expire in {settings.OTP_EXPIRE_MINUTES} minutes.</p>",
                }
            ]
        }
        mailjet.send.create(data=data)
