import razorpay
import boto3
import filetype
import io
import uuid
from backend.core.config import settings
from fastapi import UploadFile, HTTPException, status
from botocore.exceptions import BotoCoreError, ClientError
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from datetime import datetime

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
    currency: str = "INR",
):
    buffer = io.BytesIO()

    pdf = canvas.Canvas(buffer, pagesize=letter)
    pdf.setTitle(f"Invoice_{order_id}")
    pdf.setFont("Helvetica-Bold", 24)
    pdf.drawString(50, 670, "INVOICE")
    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, 630, f"Transaction ID: {transaction_id}")
    pdf.drawString(50, 610, f"Order ID: {order_id}")
    pdf.drawString(50, 590, f"Payment ID: {payment_id}")
    pdf.drawString(50, 570, f"Date(UTC): {order_date.strftime('%Y-%m-%d %H:%M')}")
    pdf.drawString(50, 550, f"Student ID: {student_id}")
    pdf.line(50, 530, 605, 530)
    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(50, 500, "Description")
    pdf.drawString(520, 500, "Amount")
    pdf.setFont("Helvetica", 12)
    pdf.drawString(50, 470, f"Course Enrollment (ID: {course_id})")
    pdf.drawString(50, 450, f"Course Name: {course_name}")
    pdf.drawString(50, 430, f"Course Type: {course_type}")
    pdf.drawString(520, 470, f"{currency} {amount / 100:.2f}")

    pdf.showPage()
    pdf.save()
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
