from .schemas import CompanyProfile, PageData

def build_profile(name: str, url: str, page: PageData, target: str | None) -> CompanyProfile:
    limits = ["Based only on the public homepage; no JavaScript was executed."]
    opps: list[str] = []
    if not page.title:
        limits.append("No page title found.")
        opps.append("Suggestion: add a descriptive page title.")
    if not page.meta_description:
        opps.append("Suggestion: no meta description was found; adding one may help search snippets.")
    if not page.headings:
        opps.append("Suggestion: no headings detected; clearer structure may help readability and SEO.")
    if len(page.text_excerpt) < 300:
        limits.append("Very little readable text; the site may be JavaScript-rendered or blocking scrapers.")
    if target:
        opps.append(f"Suggestion: explore whether '{target}' fits their needs; confirm with further research.")
    parts = [page.meta_description]
    if page.headings:
        parts.append("Headings: " + "; ".join(page.headings[:5]))
    summary = " ".join(p for p in parts if p) or "Not enough readable content to summarize."
    return CompanyProfile(company_name=name, website_url=url, title=page.title, text_excerpt=page.text_excerpt,
                          meta_description=page.meta_description, headings=page.headings,
                          summary=summary, suggested_opportunities=opps, limitations=limits)
