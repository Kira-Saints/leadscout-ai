from typing import Literal, Optional
from pydantic import BaseModel, Field

class ResearchRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    website_url: str = Field(min_length=3, max_length=2048)
    target_service: Optional[str] = Field(default=None, max_length=120)

class PageData(BaseModel):
    title: str = ""
    meta_description: str = ""
    headings: list[str] = []
    text_excerpt: str = ""

class CompanyProfile(BaseModel):
    company_name: str
    website_url: str
    title: str
    meta_description: str
    headings: list[str]
    text_excerpt: str = ""
    summary: str
    suggested_opportunities: list[str]  # suggestions, not confirmed problems
    limitations: list[str]
    source: Literal["basic"] = "basic"

class AnalysisInput(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    website_url: str = Field(max_length=2048)
    target_service: Optional[str] = Field(default=None, max_length=120)
    title: str = Field(default="", max_length=300)
    meta_description: str = Field(default="", max_length=500)
    headings: list[str] = Field(default=[], max_length=15)
    text_excerpt: str = Field(default="", max_length=3000)

class Opportunity(BaseModel):
    title: str
    why: str

class AIResult(BaseModel):
    summary: str
    opportunities: list[Opportunity]
    email_subject: str
    email_body: str
    source: Literal["ai"] = "ai"

class OutreachRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=120)
    website_url: str = Field(default="", max_length=2048)
    target_service: Optional[str] = Field(default=None, max_length=120)
    summary: str = Field(default="", max_length=2000)
    sender_name: str = Field(default="", max_length=80)
    use_ai: bool = False

class OutreachResponse(BaseModel):
    subject: str
    body: str
    source: Literal["ai", "template"]
