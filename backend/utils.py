import razorpay
import boto3
import filetype
from backend.core.config import settings
from fastapi import UploadFile, HTTPException, status
from botocore.exceptions import BotoCoreError, ClientError

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
def generate_upload_presigned_url(s3_key: str, expires_in: int = 1200) -> str:
    return s3_client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": s3_key,
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