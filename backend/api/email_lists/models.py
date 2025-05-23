from datetime import datetime
from typing import Optional, List
from beanie.odm.documents import Document
from beanie import PydanticObjectId
from api.email_lists.schemas import EmailListType
from api.schemas import EmailDetails
from pydantic import Field
from api.app_config import current_utc_timestamp, simple_pydantic_model_config


class EmailList(Document):
    class Settings:
        name = "email_lists"
        use_state_management = True

    model_config = simple_pydantic_model_config

    id: PydanticObjectId = Field(
        description="Email list id",
        default_factory=lambda: PydanticObjectId(),
        alias="_id",
    )

    name: str = Field(description="Name of email list", default="New email list")
    emails: List[EmailDetails] = Field(
        description="List of email addresses", default=[]
    )
    created_at: int = Field(
        description="Creation time of email list - UTC TIMESTAMP", default_factory=current_utc_timestamp
    )
    last_modified: int = Field(
        description="Last modified date of email list - UTC TIMESTAMP", default_factory=current_utc_timestamp
    )
    email_list_type: EmailListType = Field(description="Email list type")
    user_id: PydanticObjectId = Field(description="Id of user")
    url: str = Field(description="Url to file")
